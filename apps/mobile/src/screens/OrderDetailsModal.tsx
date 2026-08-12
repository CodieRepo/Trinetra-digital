import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Order, StaffUser } from '../store/useStaffOrderStore';

interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  staff: StaffUser | null;
  isInFlight?: boolean;
  onClose: () => void;
  onTransition: (orderId: string, targetStatus: Order['status']) => Promise<{ success: boolean; message?: string }>;
}

export default function OrderDetailsModal({
  visible,
  order,
  staff,
  isInFlight = false,
  onClose,
  onTransition,
}: OrderDetailsModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!order) return null;

  const role = staff?.role || 'kitchen';

  // Determine role-aware allowed next action
  const getActionConfig = (): { label: string; targetStatus: Order['status']; style: any } | null => {
    const s = order.status;

    if (role === 'kitchen' || role === 'manager' || role === 'owner') {
      if (s === 'placed') return { label: 'ACCEPT ORDER', targetStatus: 'accepted', style: styles.btnAccept };
      if (s === 'accepted') return { label: 'START PREPARING', targetStatus: 'preparing', style: styles.btnPreparing };
      if (s === 'preparing') return { label: 'MARK READY FOR PICKUP', targetStatus: 'ready', style: styles.btnReady };
    }

    if (role === 'waiter' || role === 'manager' || role === 'owner' || role === 'cashier') {
      if (s === 'ready') return { label: 'MARK SERVED TO TABLE', targetStatus: 'served', style: styles.btnServed };
      if (s === 'served') return { label: 'CLOSE ORDER', targetStatus: 'closed', style: styles.btnClose };
    }

    return null;
  };

  const actionConfig = getActionConfig();
  const isDisabled = submitting || isInFlight;

  const handleAction = async (targetStatus: Order['status']) => {
    if (isDisabled) return; // Duplicate tap prevention

    setSubmitting(true);
    try {
      const result = await onTransition(order.id, targetStatus);
      if (result.success) {
        Alert.alert('Status Updated', `Order #${order.id.slice(0, 6)} updated to ${targetStatus.toUpperCase()}`);
      } else {
        Alert.alert('Transition Rejected', result.message || `Failed to transition order to ${targetStatus}.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.orderId}>Order #{order.id.slice(0, 6)}</Text>
              <Text style={styles.tableNum}>
                {order.table ? `Table ${order.table.table_number}` : 'Takeout / Direct'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isDisabled}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status Badge */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>CURRENT STATUS:</Text>
            <View style={[styles.badge, styles[`badge_${order.status}` as keyof typeof styles] || styles.badge_default]}>
              <Text style={styles.badgeText}>{order.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Order Items List */}
          <ScrollView style={styles.itemsList}>
            <Text style={styles.sectionHeader}>ORDER ITEMS ({order.items.length})</Text>
            {order.items.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{item.quantity}x</Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.notes ? <Text style={styles.itemNotes}>Note: {item.notes}</Text> : null}
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}

            {order.notes ? (
              <View style={styles.orderNotesBox}>
                <Text style={styles.notesBoxHeader}>Special Instructions:</Text>
                <Text style={styles.notesBoxText}>{order.notes}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Total & Action Footer */}
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.totalValue}>₹{order.total_amount.toFixed(0)}</Text>
            </View>

            {actionConfig ? (
              <TouchableOpacity
                style={[styles.actionBtn, actionConfig.style, isDisabled && styles.btnDisabled]}
                onPress={() => handleAction(actionConfig.targetStatus)}
                disabled={isDisabled}
              >
                {isDisabled ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.actionBtnText}>{actionConfig.label}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.noActionText}>
                No transitions available for {role.toUpperCase()} role at status ({order.status}).
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  orderId: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  tableNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#818cf8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 20,
    color: '#94a3b8',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginRight: 8,
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badge_placed: { backgroundColor: '#3b82f6' },
  badge_accepted: { backgroundColor: '#8b5cf6' },
  badge_preparing: { backgroundColor: '#f59e0b' },
  badge_ready: { backgroundColor: '#22c55e' },
  badge_served: { backgroundColor: '#10b981' },
  badge_closed: { backgroundColor: '#64748b' },
  badge_cancelled: { backgroundColor: '#ef4444' },
  badge_default: { backgroundColor: '#475569' },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  itemsList: {
    maxHeight: 280,
    marginVertical: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
    letterSpacing: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  qtyBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  qtyText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '700',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  itemNotes: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  orderNotesBox: {
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  notesBoxHeader: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '700',
  },
  notesBoxText: {
    color: '#e0e7ff',
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 16,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22c55e',
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnAccept: { backgroundColor: '#3b82f6' },
  btnPreparing: { backgroundColor: '#f59e0b' },
  btnReady: { backgroundColor: '#22c55e' },
  btnServed: { backgroundColor: '#10b981' },
  btnClose: { backgroundColor: '#475569' },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  noActionText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
