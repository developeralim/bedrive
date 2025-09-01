<?php

namespace App\Services\Shares;

use App\Models\FileEntry;
use App\Models\User;
use App\Services\Shares\Traits\AttachesFileEntriesToUsers;
use App\Services\Shares\Traits\GeneratesSharePermissions;
use Common\Files\Traits\ChunksChildEntries;
use Illuminate\Database\Eloquent\Collection;

class AttachUsersToEntry
{
    use AttachesFileEntriesToUsers,
        GeneratesSharePermissions,
        ChunksChildEntries;

    public function execute(
        array $emails,
        array $entries,
        array $permissions,
        bool $premium = false,
        int $price = 0
    ): Collection {
        $entries = array_map(function( $entry ){
            return FileEntry::find($entry);
        },$entries);
        $users   = User::whereIn('email', $emails)->get();

        // permissions on each user are expected
        $transformedUsers = $users->map(
            fn(User $user) => [
                'id' => $user->id,
                'permissions' => $this->generateSharePermissions($permissions),
            ],
        );

        $transformedUsers->chunk(200)->each(function ($users) use ($entries,$premium,$price) {
            $this->chunkChildEntries($entries, function ($chunk) use ($users,$premium,$price) {
                $this->attachFileEntriesToUsers($users, $chunk,$premium,$price);
            });
        });

        return $users;
    }
}
