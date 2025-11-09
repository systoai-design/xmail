-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Set up cron job to process scheduled emails every minute
SELECT cron.schedule(
  'process-scheduled-emails',
  '* * * * *', -- Run every minute
  $$
  SELECT
    net.http_post(
        url:='https://vcximsuxjsmnnaikpqbe.supabase.co/functions/v1/process-scheduled-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeGltc3V4anNtbm5haWtwcWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjE4NzksImV4cCI6MjA3Nzg5Nzg3OX0.9787KbW9DPyoVzlHHG23Jj3igDUCtmCDUc4696WEkOk"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);