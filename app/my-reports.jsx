import React, { useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useIncidentsStore } from '@/store/incidents-store';
import { useAuthStore } from '@/store/auth-store';
import { IncidentCard } from '@/components/IncidentCard';
import { EmptyState } from '@/components/EmptyState';

export default function MyReportsScreen() {
  const router = useRouter();
  const { incidents, fetchIncidents, isLoading } = useIncidentsStore();
  const { user } = useAuthStore();
  
  useEffect(() => {
    fetchIncidents();
  }, []);

  // Filter incidents to show only those reported by the current user
  const userIncidents = incidents.filter(incident => incident.reportedBy === user?.id);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Reports</Text>
        <Text style={styles.subtitle}>
          {userIncidents.length} {userIncidents.length === 1 ? 'report' : 'reports'} submitted
        </Text>
      </View>
      
      {userIncidents.length > 0 ? (
        <FlatList
          data={userIncidents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IncidentCard
              incident={item}
              onPress={() => router.push(`/incident/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="No Reports Yet"
          message="You haven't reported any incidents yet. Help keep your community safe by reporting incidents when you see them."
          actionLabel="Report an Incident"
          onAction={() => router.push('/report')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.background,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
}); 