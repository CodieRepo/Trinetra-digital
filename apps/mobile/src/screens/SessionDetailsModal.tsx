import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { apiRequest } from '../services/api';
import { StaffUser } from '../store/useStaffOrderStore';

export interface SessionData {
  id: string;
  table_id: string | null;
  table: { id: string; table_number: string } | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_status: 'unpaid' | 'paid' | 'partially_paid' | 'refunded';
  paid_at: string | null;
  order_count: number;
  session_total: number;
  all_orders_terminal: boolean;
  orders: Array<{
    id: string;
    status: string;
    notes: string | null;
    total_amount: number;
    created_at: string;
    items: Array<{ id: string; name: string; quantity: number; price: number; notes: string | null }>;
  }>;
}

interface SessionDetailsModalProps {
  visible: boolean;
  session: SessionData | null;
  staff: StaffUser | null;
  onClose: () => void;
  onSessionUpdated: () => void;
}

export default function SessionDetailsModal({
  visible,
  session,
  staff,
  onClose,
  onSessionUpdated,
}: SessionDetailsModalProps) {
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingClose, setSubmittingClose] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  if (!session) return null;

  const role = staff?.role || 'kitchen';
  const isPaid = session.payment_status === 'paid';
  const isClosed = session.status === 'closed';

  // Role permissions
  const canSettlePayment = role === 'cashier' || role === 'waiter' || role === 'manager' || role === 'owner';
  const canApplyDiscount = role === 'cashier' || role === 'manager' || role === 'owner' || role === 'waiter';
  const canCloseSession = role === 'waiter' || role === 'cashier' || role === 'manager' || role === 'owner';

  const handleProcessPayment = async () => {
    if (submittingPayment || isPaid) return;

    setSubmittingPayment(true);
    try {
      const discVal = Number(discountValue) || 0;
      const body: any = {
        session_id: session.id,
        payment_method: 'cash',
        discount_type: discVal > 0 ? 'percentage' : 'none',
        discount_value: discVal,
        discount_reason: discountReason || 'Staff discount',
      };

      const response = await apiRequest('/api/staff/sessions/payment', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (response && response.success) {
        Alert.alert('Payment Settled', `Payment of ₹${response.grand_total.toFixed(0)} marked as PAID.`);
        onSessionUpdated();
      } else {
        Alert.alert('Payment Failed', response?.error || 'Failed to process payment');
      }
    } catch (err: any) {
      Alert.alert('Payment Rejected', err.message || 'Payment processing failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCloseSession = async () => {
    if (submittingClose || isClosed) return;

    setSubmittingClose(true);
    try {
      const response = await apiRequest('/api/staff/sessions/close', {
        method: 'POST',
        body: JSON.stringify({ session_id: session.id }),
      });

      if (response && response.success) {
        Alert.alert('Session Closed', `Table session closed successfully.`);
        onSessionUpdated();
        onClose();
      } else {
        Alert.alert('Closure Failed', response?.error || 'Failed to close session');
      }
    } catch (err: any) {
      Alert.alert('Closure Rejected', err.message || 'Failed to close table session');
    } finally {
      setSubmittingClose(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.tableNum}>
                {session.table ? `Table ${session.table.table_number}` : 'Direct Session'}
              </Text>
              <Text style={styles.sessionId}>Session #{session.id.slice(0, 6)}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status Badges */}
          <View style={styles.statusRow}>
            <View style={[styles.badge, isPaid ? styles.badgePaid : styles.badgeUnpaid]}>
              <Text style={styles.badgeText}>{session.payment_status.toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, isClosed ? styles.badgeClosed : styles.badgeActive]}>
              <Text style={styles.badgeText}>{session.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Customer Info */}
          {session.customer_name ? (
            <View style={styles.customerBox}>
              <Text style={styles.customerName}>👤 {session.customer_name}</Text>
              {session.customer_phone ? <Text style={styles.customerPhone}>📞 {session.customer_phone}</Text> : null}
            </View>
          ) : null}

          {/* Session Orders List */}
          <ScrollView style={styles.ordersList}>
            <Text style={styles.sectionHeader}>SESSION ORDERS ({session.orders.length})</Text>

            {session.orders.map((ord, idx) => (
              <View key={ord.id || idx} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Order #{ord.id.slice(0, 6)}</Text>
                  <Text style={styles.orderStatus}>{ord.status.toUpperCase()}</Text>
                </View>

                {ord.items.map((item, itemIdx) => (
                  <Text key={item.id || itemIdx} style={styles.itemLine}>
                    • {item.quantity}x {item.name} — ₹{(item.price * item.quantity).toFixed(0)}
                  </Text>
                ))}

                <Text style={styles.orderTotalText}>Order Subtotal: ₹{ord.total_amount.toFixed(0)}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Discount Input toggle */}
          {canApplyDiscount && !isPaid && (
            <View style={styles.discountContainer}>
              <TouchableOpacity
                style={styles.discountToggleBtn}
                onPress={() => setShowDiscountInput(!showDiscountInput)}
              >
                <Text style={styles.discountToggleText}>
                  {showDiscountInput ? '➖ Hide Staff Discount' : '➕ Apply Staff Discount (%)'}
                </Text>
              </TouchableOpacity>

              {showDiscountInput && (
                <View style={styles.discountForm}>
                  <TextInput
                    style={styles.discountInput}
                    placeholder="Discount % (e.g. 10)"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={discountValue}
                    onChangeText={setDiscountValue}
                  />
                  <TextInput
                    style={styles.discountInput}
                    placeholder="Reason (e.g. Owner Discount)"
                    placeholderTextColor="#64748b"
                    value={discountReason}
                    onChangeText={setDiscountReason}
                  />
                </View>
              )}
            </View>
          )}

          {/* Total & Payment Footer */}
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL PAYABLE</Text>
              <Text style={styles.totalValue}>₹{session.session_total.toFixed(0)}</Text>
            </View>

            <View style={styles.actionRow}>
              {!isPaid && canSettlePayment && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnPay]}
                  onPress={handleProcessPayment}
                  disabled={submittingPayment}
                >
                  {submittingPayment ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.btnText}>MARK BILL PAID</Text>
                  )}
                </TouchableOpacity>
              )}

              {!isClosed && canCloseSession && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnClose, !isPaid && styles.btnDisabled]}
                  onPress={handleCloseSession}
                  disabled={submittingClose}
                >
                  {submittingClose ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.btnText}>CLOSE SESSION</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
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
  tableNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  sessionId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#818cf8',
    marginTop: 2,
  },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 20, color: '#94a3b8' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgePaid: { backgroundColor: '#14532d' },
  badgeUnpaid: { backgroundColor: '#7f1d1d' },
  badgeActive: { backgroundColor: '#3b82f6' },
  badgeClosed: { backgroundColor: '#475569' },
  badgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  customerBox: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  customerName: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
  customerPhone: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  ordersList: { maxHeight: 220, marginVertical: 8 },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 8, letterSpacing: 1 },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  orderStatus: { color: '#818cf8', fontSize: 11, fontWeight: '700' },
  itemLine: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  orderTotalText: { color: '#22c55e', fontSize: 12, fontWeight: '700', marginTop: 6, textAlign: 'right' },
  discountContainer: { marginVertical: 8 },
  discountToggleBtn: { paddingVertical: 6 },
  discountToggleText: { color: '#818cf8', fontSize: 12, fontWeight: '700' },
  discountForm: { marginTop: 8 },
  discountInput: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  footer: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 16, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', letterSpacing: 1 },
  totalValue: { fontSize: 24, fontWeight: '800', color: '#22c55e' },
  actionRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  btnPay: { backgroundColor: '#16a34a' },
  btnClose: { backgroundColor: '#475569' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
