import { TodayView } from '@/features/today/components/today-view';
import { chargerJournee } from '@/features/today/data';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const full =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? '';
  const firstName = full.split(/[\s.]/)[0] || 'à vous';
  const journee = await chargerJournee(supabase);
  return (
    <TodayView
      firstName={firstName.charAt(0).toUpperCase() + firstName.slice(1)}
      journee={journee}
    />
  );
}
