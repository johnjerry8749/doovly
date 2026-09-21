import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Fetch professionals with offline support.
 * Data is cached and will still show when the user has no internet.
 */
export function useProfessionals(city?: string) {
  return useQuery({
    queryKey: ['professionals', city || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('professionals')
        .select(`
          id,
          profession,
          bio,
          price_from,
          is_verified,
          is_available,
          city,
          rating,
          review_count,
          avatar_url,
          profiles (
            full_name,
            phone
          )
        `)
        .eq('is_available', true)
        .order('rating', { ascending: false });

      if (city && city !== 'All Nigeria') {
        query = query.ilike('city', `%${city}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
