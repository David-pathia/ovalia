import { TodayView } from '@/features/today/components/today-view';
import { getUser } from '@/lib/supabase/server';

export default async function TodayPage() {
  const user = await getUser();
  const full = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? '';
  const firstName = full.split(/[\s.]/)[0] || 'à vous';
  return <TodayView firstName={firstName.charAt(0).toUpperCase() + firstName.slice(1)} />;
}
