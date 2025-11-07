-- Enable realtime updates for encrypted_emails table
ALTER PUBLICATION supabase_realtime ADD TABLE encrypted_emails;

-- Set replica identity to full to get complete row data in realtime events
ALTER TABLE encrypted_emails REPLICA IDENTITY FULL;