# Database Migrations

To apply these migrations to your Supabase project:

1. Go to your Supabase project dashboard → SQL Editor
2. Open `00001_schema.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click "Run" or "Execute"

The migration will create all tables, indexes, and RLS policies automatically.

## After running the migration, enable Realtime:

1. Go to your Supabase project dashboard → Database → Replication
2. Ensure the following tables are in the `supabase_realtime` publication:
   - `messages`
   - `contacts`
   - `call_signals`
