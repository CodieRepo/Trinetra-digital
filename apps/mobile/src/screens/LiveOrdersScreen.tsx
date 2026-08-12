import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { staffOrderStore, Order, StaffOrderStoreState } from '../store/useStaffOrderStore';
import OrderDetailsModal from './OrderDetailsModal';

export default function LiveOrdersScreen() {
  const [storeState, setStoreState] = useState<StaffOrderStoreState>(staffOrderStore.getState());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Subscribe to store state updates
    const unsubscribe = staffOrderStore.subscribe(() => {
      setStoreState({ ...staffOrderStore.getState() });
    });

    // Initial fetch
    staffOrderStore.getState().fetchOrders();

    return () => unsubscribe();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await staffOrderStore.getState().fetchOrders();
    setRefreshing(false);
  }, []);

  const { orders, activeFilter, selectedOrder, isLoading, inFlightOrderIds, error, staff } = storeState;

  // Filter orders by active status tab
  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'all') return true;
    return o.status === activeFilter;
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'placed': return { bg: '#1e3a8a', text: '#93c5fd' };
      case 'accepted': return { bg: '#4c1d95', text: '#c4b5fd' };
      case 'preparing': return { bg: '#78350f', text: '#fde68a' };
      case 'ready': return { bg: '#14532d', text: '#86efac' };
      case 'served': return { bg: '#064e3b', text: '#6ee7b7' };
      default: return { bg: '#334155', text: '#cbd5e1' };
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
    if (mins === 0) return 'Just now';
    return `${mins}m ago`;
  };

  const renderOrderItem = useCallback(({ item }: { item: Order }) => {
    const badge = getStatusBadgeStyle(item.status);
    const isInFlight = Boolean(inFlightOrderIds[item.id]);
    const isNewPlaced = item.status === 'placed';

    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          isNewPlaced && styles.orderCardPlaced,
          isInFlight && styles.orderCardInFlight,
        ]}
        onPress={() => staffOrderStore.getState().setSelectedOrder(item)}
        activeOpacity={0.7}
        disabled={isInFlight}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderIdBox}>
            <Text style={styles.orderIdText}>#{item.id.slice(0, 6)}</Text>
            <Text style={styles.tableName}>
              {item.table ? `Table ${item.table.table_number}` : 'Direct Order'}
            </Text>
          </View>

          {isInFlight ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{item.status.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.itemCountText}>
            {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
          </Text>
          <Text style={styles.timeText}>{getTimeAgo(item.created_at)}</Text>
        </View>

        {item.notes ? (
          <View style={styles.noteSnippetBox}>
            <Text style={styles.noteSnippetText} numberOfLines={1}>
              Note: {item.notes}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.totalText}>Total: ₹{item.total_amount.toFixed(0)}</Text>
          <Text style={styles.detailsBtnText}>
            {isInFlight ? 'Updating...' : 'Tap for Details →'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [inFlightOrderIds]);

  const filterTabs: Array<{ id: 'all' | 'placed' | 'accepted' | 'preparing' | 'ready'; label: string }> = [
    { id: 'all', label: `ALL (${orders.length})` },
    { id: 'placed', label: `NEW (${orders.filter((o) => o.status === 'placed').length})` },
    { id: 'accepted', label: `ACCEPTED (${orders.filter((o) => o.status === 'accepted').length})` },
    { id: 'preparing', label: `PREPARING (${orders.filter((o) => o.status === 'preparing').length})` },
    { id: 'ready', label: `READY (${orders.filter((o) => o.status === 'ready').length})` },
  ];

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item.id && styles.filterChipActive]}
              onPress={() => staffOrderStore.getState().setActiveFilter(item.id)}
            >
              <Text style={[styles.filterChipText, activeFilter === item.id && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* Orders List */}
      {isLoading && orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Fetching live restaurant orders...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === 'all'
                  ? 'There are no active orders right now.'
                  : `No orders matching status "${activeFilter.toUpperCase()}".`}
              </Text>
            </View>
          }
        />
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        visible={Boolean(selectedOrder)}
        order={selectedOrder}
        staff={staff}
        isInFlight={Boolean(selectedOrder && inFlightOrderIds[selectedOrder.id])}
        onClose={() => staffOrderStore.getState().setSelectedOrder(null)}
        onTransition={(orderId, targetStatus) =>
          staffOrderStore.getState().transitionOrderStatus(orderId, targetStatus)
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  filterBar: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderCardPlaced: {
    borderColor: '#3b82f6',
    borderWidth: 1.5,
  },
  orderCardInFlight: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderIdBox: {},
  orderIdText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  tableName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#818cf8',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  itemCountText: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noteSnippetBox: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  noteSnippetText: {
    color: '#f59e0b',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22c55e',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818cf8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 6,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '600',
  },
});
