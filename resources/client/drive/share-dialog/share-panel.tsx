import { useState } from 'react';
import { Button } from '@ui/buttons/button';
import { useShareEntry } from './queries/use-share-entry';
import {
  PermissionSelector,
  PermissionSelectorItem,
  PermissionSelectorItems,
} from './permission-selector';
import { MemberList } from './member-list';
import {
  ChipField,
  ChipValue,
} from '@ui/forms/input-field/chip-field/chip-field';
import { useTrans } from '@ui/i18n/use-trans';
import { Trans } from '@ui/i18n/trans';
import { DriveEntry } from '../files/drive-entry';
import { Item } from '@ui/forms/listbox/item';
import { useSettings } from '@ui/settings/use-settings';
import { useNormalizedModels } from '@common/ui/normalized-model/use-normalized-models';
import { isEmail } from '@ui/utils/string/is-email';
import { Avatar } from '@ui/avatar/avatar';
import { toast } from '@ui/toast/toast';
import { Switch } from '@ui/forms/toggle/switch';

interface SharePanelProps {
  className?: string;
  entry: DriveEntry;
}
export function SharePanel({ className, entry }: SharePanelProps) {
  const { trans } = useTrans();
  const { share } = useSettings();
  const shareEntry = useShareEntry();
  const [chips, setChips] = useState<ChipValue[]>([]);
  const [isPremium,setIsPremium] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [price,setPrice] = useState<string>('0');
  const [selectedPermission, setSelectedPermission] = useState<PermissionSelectorItem>(PermissionSelectorItems[0]);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const allEmailsValid = chips.every(chip => !chip.invalid);
  const [inputValue, setInputValue] = useState('');
  const query = useNormalizedModels(
    'normalized-models/user',
    { perPage: 7, query: inputValue },
    { enabled: share?.suggest_emails },
  );

  // show user's email, instead of name in the chip
  const displayWith = (chip: ChipValue) => chip.description || chip.name;

  return (
    <div className={className}>
      <ChipField
        value={chips}
        onChange={setChips}
        isAsync
        isLoading={query.fetchStatus === 'fetching'}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        suggestions={query.data?.results}
        displayWith={displayWith}
        validateWith={chip => {
          const invalid = !isEmail(chip.description);
          return {
            ...chip,
            invalid,
            errorMessage: invalid
              ? trans({ message: 'Not a valid email' })
              : undefined,
          };
        }}
        placeholder={trans({ message: 'Enter email addresses' })}
        label={<Trans message="Invite people" />}
      >
        {user => (
          <Item
            value={user.id}
            startIcon={<Avatar circle src={user.image} alt="" />}
            description={user.description}
          >
            {user.name}
          </Item>
        )}
      </ChipField>
      {chips.length ? (<div className="mt-14 flex items-center justify-between">
        <span>{trans({ message: 'Scheduled at' })}</span>
        <input
          type="datetime-local"
          className="w-[350px] appearance-none rounded-md border border-gray-300 bg-white px-5 py-2 pr-10 text-black placeholder-gray-500
             focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
             dark:border-gray-600 dark:bg-black dark:text-white dark:placeholder-gray-400"
          onChange={(e) => {
            const localDateTime = e.target.value;
            if (!localDateTime) return;
            const selectedDate = new Date(localDateTime);
            const now = new Date();
            if (selectedDate < now) {
              toast.danger(trans({ message: 'Please select a future time' }));
              e.target.value = "";
              return;
            }
            const utcDateTime = selectedDate.toISOString();
            setScheduledAt(utcDateTime);
          }}
        />
      </div>) : null}
      {chips.length ? (<>
        <div className='mt-14 flex items-center justify-between '>
          <Switch
            disabled={false}
            onChange={() => setIsPremium(!isPremium)}
          >
            <Trans message="Premium" />
          </Switch>
          {isPremium && <input
            type="number"
            onChange={(e) => setPrice(e.target.value)}
            className='appearance-none rounded-md border border-gray-300 bg-white px-5 py-2 pr-10 text-black placeholder-gray-500
             focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
             dark:border-gray-600 dark:bg-black dark:text-white dark:placeholder-gray-400'
             value={price}
          />}
        </div>
      </>) : null}
      <div className="mt-14 flex items-center justify-between gap-14">
        <PermissionSelector
          onChange={setSelectedPermission}
          value={selectedPermission}
        />
        {chips.length ? (
          <Button
            variant="flat"
            color="primary"
            size="sm"
            disabled={isSharing || !allEmailsValid}
            onClick={() => {
              setIsSharing(true);
              shareEntry.mutate(
                {
                  emails: chips.map(c => displayWith(c)),
                  permissions: selectedPermission.value,
                  entryId: entry.id,
                  scheduledAt: scheduledAt,
                  premium : isPremium,
                  price : price
                },
                {
                  onSuccess: () => {
                    setChips([]);
                  },
                  onSettled: () => {
                    setIsSharing(false);
                  },
                },
              );
            }}
          >
            <Trans message="Share" />
          </Button>
        ) : null}
      </div>
      <MemberList className="mt-30" entry={entry} />
    </div>
  );
}
