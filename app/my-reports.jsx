import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { Clock, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react-native';

export default function MyReportsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'verified', label: 'Verified' },
    { id: 'resolved', label: 'Resolved' },
  ];

  const reports = [
    {
      id: 1,
      type: 'Road Hazard',
      description: 'Large pothole in the middle of the road',
      location: '123 Main Street',
      timestamp: '2 hours ago',
      status: 'pending',
      image: 'https://images.unsplash.com/photo-1597638563472-b8eb0966b77b?auto=format&fit=crop&w=200&q=80',
      upvotes: 5,
    },
    {
      id: 2,
      type: 'Traffic Accident',
      description: 'Minor collision between two vehicles',
      location: 'Junction of 5th Ave and Park Road',
      timestamp: '1 day ago',
      status: 'verified',
      image: 'https://images.unsplash.com/photo-1599012307530-1c5b2e0e7f9a?auto=format&fit=crop&w=200&q=80',
      upvotes: 12,
    },
    {
      id: 3,
      type: 'Construction',
      description: 'Road work causing traffic delays',
      location: 'Highway 101 North',
      timestamp: '3 days ago',
      status: 'resolved',
      image: 'https://images.unsplash.com/photo-1517420879524-86d64ac2f339?auto=format&fit=crop&w=200&q=80',
      upvotes: 8,
    },
  ];

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

      <ScrollView style={styles.reportsList}>
        {filteredReports.map((report) => (
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
        ))}
      </ScrollView>
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
}); 