<?php

namespace App\Http\Controllers;

use App\Jobs\AttachUsersToEntriesJob;
use App\Models\FileEntry;
use App\Models\ShareableLink;
use App\Models\User;
use App\Notifications\FileEntrySharedNotif;
use App\Services\Shares\AttachUsersToEntry;
use App\Services\Shares\DetachUsersFromEntries;
use Carbon\Carbon;
use Common\Core\BaseController;
use Common\Files\Traits\ChunksChildEntries;
use Common\Validation\Validators\EmailsAreValid;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class SharesController extends BaseController
{
    use ChunksChildEntries;

    /**
     * Import entry into current user's drive using specified shareable link.
     */
    public function addCurrentUser(
        int $linkId,
        AttachUsersToEntry $action,
        ShareableLink $linkModel,
    ): JsonResponse {
        /* @var ShareableLink $link */
        $link = $linkModel->with('entry')->findOrFail($linkId);

        $this->authorize('show', [$link->entry, $link]);

        $permissions = [
            'view' => true,
            'edit' => $link->allow_edit,
            'download' => $link->allow_download,
        ];

        $action->execute([Auth::user()->email], [$link->entry], $permissions);

        return $this->success(['users' => $link->entry->users]);
    }

    public function addUsers(
        FileEntry $fileEntry,
        AttachUsersToEntry $action
    ): JsonResponse {
        $shareeEmails = request('emails');

        $this->authorize('update', $fileEntry);

        $emails = request('emails', []);

        $messages = [];
        foreach ($emails as $key => $email) {
            $messages["emails.$key"] = $email;
        }

        request()->validate(
            [
                'emails' => ['required', 'min:1', new EmailsAreValid()],
                'permissions' => 'required|array',
            ],
            [],
            $messages,
        );


        $job = new AttachUsersToEntriesJob(
            $shareeEmails,
            [$fileEntry->id],
            request('permissions'),
            auth()->id()
        );

        if (request()->scheduledAt) {
            try {
                $scheduledAt = Carbon::parse(request('scheduledAt'));

                if ($scheduledAt->isPast()) {
                    throw new \InvalidArgumentException('Scheduled time must be in the future');
                }

                $job->delay($scheduledAt);

            } catch (\Exception $e) {
                report($e);
            }
        }

        $job->onConnection(config('queue.default'));

        dispatch($job);

        return $this->success(['users' => $fileEntry->users]);
    }

    public function changePermissions(FileEntry $fileEntry)
    {
        request()->validate([
            'permissions' => 'required|array',
            'userId' => 'required|int',
        ]);

        $this->authorize('update', $fileEntry);

        $this->chunkChildEntries([$fileEntry], function (Collection $chunk) {
            DB::table('file_entry_models')
                ->where('model_id', request('userId'))
                ->where('model_type', User::MODEL_TYPE)
                ->whereIn('file_entry_id', $chunk->pluck('id'))
                ->update([
                    'permissions' => json_encode(request('permissions')),
                ]);
        });

        return $this->success(['users' => $fileEntry->users]);
    }

    public function removeUser(string $entryIds): JsonResponse
    {
        $userId =
            request('userId') === 'me' ? Auth::id() : (int) request('userId');
        $fileEntries = FileEntry::with('users')
            ->whereIn('id', explode(',', $entryIds))
            ->get();

        // there's no need to authorize if user is
        // trying to remove himself from the entry
        if ($userId !== Auth::id()) {
            $this->authorize('update', [FileEntry::class, $fileEntries]);
        }

        $this->chunkChildEntries($fileEntries, function ($chunk) use ($userId) {
            (new DetachUsersFromEntries())->execute($chunk, [$userId]);
        });

        return $this->success([
            'users' => $fileEntries
                ->pluck('users')
                ->flatten(1)
                ->unique(),
        ]);
    }
}
