import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { apiRequest } from '../services/api';
import SessionDetailsModal, { SessionData } from './SessionDetailsModal';
import { staffOrderStore } from '../store/useStaffOrderStore';

export default function TablesSessionsScreen() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const staff = staffOrderStore.getState().staff;

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiRequest('/api/staff/sessions');
      if (data && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch (err: any) {
      console.error('[TablesScreen] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const renderSessionCard = useCallback(({ item }: { item: SessionData }) => {
    const isPaid = item.payment_status === 'paid';
    return (
      <TouchableOpacity
        style={[styles.card, isPaid && styles.cardPaid]}
        onPress={() => setSelectedSession(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.tableNum}>
            {item.table ? `Table ${item.table.table_number}` : 'Direct Table'}
          </Text>
          <View style={[styles.badge, isPaid ? styles.badgePaid : styles.badgeUnpaid]}>
            <Text style={styles.badgeText}>{item.payment_status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.customerText}>
          Customer: {item.customer_name || 'Walk-in Customer'}
        </Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailText}>
            Orders: {item.order_count} • Subtotal: ₹{(item.session_total || 0).toFixed(0)}
          </Text>
          <Text style={styles.tapText}>Tap for Bill & Payment →</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Table Sessions ({sessions.length})</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading table floor sessions...</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No Active Table Sessions</Text>
              <Text style={styles.emptySubtitle}>All tables are available. Sessions appear when customer orders start.</Text>
            </View>
          }
        />
      )}

      {/* Session Details & Payment Modal */}
      <SessionDetailsModal
        visible={Boolean(selectedSession)}
        session={selectedSession}
        staff={staff}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={() => {
          setSelectedSession(null);
          fetchSessions();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardPaid: {
    borderColor: '#15803d',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgePaid: {
    backgroundColor: '#14532d',
  },
  badgeUnpaid: {
    backgroundColor: '#7f1d1d',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  customerText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  detailText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  tapText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
