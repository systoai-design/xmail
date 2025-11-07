import { useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface ScheduleSelectorProps {
  onSchedule: (date: Date) => void;
  onCancel: () => void;
}

export const ScheduleSelector = ({ onSchedule, onCancel }: ScheduleSelectorProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const quickSchedule = (hoursFromNow: number) => {
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + hoursFromNow);
    onSchedule(scheduledTime);
  };

  const handleConfirm = () => {
    if (!selectedDate) return;

    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);

    if (scheduledTime <= new Date()) {
      alert('Please select a future date and time');
      return;
    }

    onSchedule(scheduledTime);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold mb-3">Schedule Email</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose when to send this email
        </p>
      </div>

      {/* Quick Options */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Quick Schedule</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => quickSchedule(1)}
          >
            In 1 hour
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => quickSchedule(24)}
          >
            Tomorrow same time
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const tomorrow9am = new Date();
              tomorrow9am.setDate(tomorrow9am.getDate() + 1);
              tomorrow9am.setHours(9, 0, 0, 0);
              onSchedule(tomorrow9am);
            }}
          >
            Tomorrow 9 AM
          </Button>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">Custom Schedule</p>
        
        {/* Date Picker */}
        <div className="space-y-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <CalendarIcon className="w-4 h-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Time Picker */}
          <div className="flex gap-2">
            <Select value={selectedHour} onValueChange={setSelectedHour}>
              <SelectTrigger className="w-full">
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMinute} onValueChange={setSelectedMinute}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute}>
                    {minute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDate && (
            <div className="text-sm text-muted-foreground p-2 bg-muted rounded-lg">
              Will send on{' '}
              <span className="font-medium text-foreground">
                {format(selectedDate, 'PPP')} at {selectedHour}:{selectedMinute}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handleConfirm}
          disabled={!selectedDate}
        >
          Schedule Send
        </Button>
      </div>
    </div>
  );
};
