import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { Clock, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { API_URL } from '@/utils/config';

export default function MyReportsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState('all');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'verified', label: 'Verified' },
    { id: 'resolved', label: 'Resolved' },
  ];

  // Fetch user's reports from backend
  const fetchMyReports = async () => {
    if (!token) {
      console.log('No token available');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/incidents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Transform backend data to match frontend format
        const transformedReports = data.data.incidents.map(incident => ({
          id: incident._id,
          type: incident.type,
          description: incident.description,
          location: incident.address || `${incident.location.coordinates[1]}, ${incident.location.coordinates[0]}`,
          timestamp: formatTimestamp(incident.createdAt),
          status: incident.status,
          image: incident.images && incident.images.length > 0 ? incident.images[0] : null,
          upvotes: incident.upvotes || 0,
          severity: incident.severity,
        }));
        
        setReports(transformedReports);
      } else {
        console.error('Failed to fetch reports:', data.message);
      }
    } catch (error) {
      console.error('Error fetching my reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Format timestamp to readable format
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const reportTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - reportTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} days ago`;
    return reportTime.toLocaleDateString();
  };

  // Refresh reports
  const onRefresh = () => {
    setRefreshing(true);
    fetchMyReports();
  };

  useEffect(() => {
    fetchMyReports();
  }, [token]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color={colors.warning} />;
      case 'verified':
        return <CheckCircle2 size={16} color={colors.success} />;
      case 'resolved':
        return <XCircle size={16} color={colors.textSecondary} />;
      default:
        return <AlertTriangle size={16} color={colors.warning} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'verified':
        return colors.success;
      case 'resolved':
        return colors.textSecondary;
      default:
        return colors.warning;
    }
  };

  const filteredReports = reports.filter(report => 
    activeFilter === 'all' || report.status === activeFilter
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'My Reports',
          headerShadowVisible: false,
        }}
      />

      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              activeFilter === filter.id && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(filter.id)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.id && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your reports...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.reportsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {filteredReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AlertTriangle size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No reports found</Text>
              <Text style={styles.emptySubtext}>
                {activeFilter === 'all' 
                  ? 'You haven\'t reported any incidents yet'
                  : `No ${activeFilter} reports found`
                }
              </Text>
            </View>
          ) : (
            filteredReports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportCard}
            onPress={() => router.push(`/incident/${report.id}`)}
          >
            <Image
              source={{ uri: report.image }}
              style={styles.reportImage}
            />
            <View style={styles.reportContent}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportType}>{report.type}</Text>
                <View style={styles.statusContainer}>
                  {getStatusIcon(report.status)}
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(report.status) },
                    ]}
                  >
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.reportDescription} numberOfLines={2}>
                {report.description}
              </Text>

              <View style={styles.reportFooter}>
                <View>
                  <Text style={styles.locationText}>{report.location}</Text>
                  <Text style={styles.timestampText}>{report.timestamp}</Text>
                </View>
                <View style={styles.upvotesContainer}>
                  <Text style={styles.upvotesText}>{report.upvotes} upvotes</Text>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
            ))
          )}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
    height: 52,
    justifyContent: 'center',
  },
  filters: {
    padding: 12,
    paddingBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  reportsList: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.card,
  },
  reportContent: {
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  locationText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  upvotesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upvotesText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
}); 