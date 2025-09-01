<?php

namespace App\Jobs;

use App\Models\FileEntry;
use App\Models\User;
use App\Notifications\FileEntrySharedNotif;
use App\Services\Shares\AttachUsersToEntry;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class AttachUsersToEntriesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected array $emails,
        protected array $entryIds,
        protected array $permissions,
        protected int $sharer,
        protected bool $premium,
        protected int $price
    ) {

    }

    public function handle(AttachUsersToEntry $service)
    {
        $sharees = $service->execute(
            $this->emails,
            $this->entryIds,
            $this->permissions,
            $this->premium,
            $this->price
        );

        if (settings('drive.send_share_notification')) {
            try {
                $sharer  = User::find($this->sharer);
                $notification = new FileEntrySharedNotif($this->entryIds,$sharer);
                Notification::send($sharees,$notification);
            } catch (Exception $e) {
                Log::debug($e->getMessage());
                report($e);
            }
        }
    }
}
