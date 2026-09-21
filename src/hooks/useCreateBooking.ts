import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

type CreateBookingInput = {
  professionalId: string;
  serviceName: string;
  scheduledAt: string; // ISO string
  price: number;
  address: string;
  notes?: string;
};

/**
 * Create a booking with optimistic UI update.
 * The UI updates immediately even if the network is slow or offline.
 * When the request fails it automatically rolls back.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to create a booking');
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          professional_id: input.professionalId,
          service_name: input.serviceName,
          scheduled_at: input.scheduledAt,
          price: input.price,
          address: input.address,
          notes: input.notes ?? null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // Optimistic update – show the booking instantly
    onMutate: async (newBooking) => {
      await queryClient.cancelQueries({ queryKey: ['my-bookings'] });

      const previousBookings = queryClient.getQueryData(['my-bookings']);

      queryClient.setQueryData(['my-bookings'], (old: any[] = []) => [
        {
          id: `temp-${Date.now()}`,
          ...newBooking,
          status: 'pending',
          created_at: new Date().toISOString(),
          isOptimistic: true,
        },
        ...old,
      ]);

      return { previousBookings };
    },

    onError: (error: any, _variables, context) => {
      // Rollback on failure
      if (context?.previousBookings) {
        queryClient.setQueryData(['my-bookings'], context.previousBookings);
      }

      Alert.alert(
        'Booking failed',
        error?.message || 'Please check your connection and try again.'
      );
    },

    onSuccess: () => {
      Alert.alert('Success', 'Your booking request has been sent!');
    },

    onSettled: () => {
      // Always refetch to get the real data from the server
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}
