import React, { useState, useRef, useEffect } from 'react';
import { resolveImage } from '../../constants/images';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Phone,
  Send,
  Paperclip,
  Mic,
  CheckCheck,
  ShieldCheck,
  Image as ImageIcon,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { useBooking, useJobMessages, useSendJobMessage } from '../../services/queryClient';
import { Booking } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { lightColors as colors, spacing, typography, radii, shadows } from '../../constants/theme';
import { formatTimeWAT } from '../../utils/date';
import { useAuthStore } from '../../stores/authStore';

interface Message {
  id: string;
  sender: 'user' | 'provider';
  text: string;
  timestamp: string;
  imageUrl?: string;
  status: 'sent' | 'delivered' | 'read';
}

const QUICK_RESPONSES = [
  "I'm at the security gate",
  'Call me when outside',
  'Where are you currently?',
  'Power / Generator is ON',
  'Water pump is switched off',
];

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const user = useAuthStore((s) => s.user);

  // Live booking context — route path/param unchanged.
  const bookingId = typeof id === 'string' ? id : '';
  const { data: liveBooking } = useBooking(bookingId);
  const booking = liveBooking ?? {
    id: bookingId,
    bookingNumber: bookingId.slice(-6) || '—',
    status: 'REQUESTED',
    service: undefined,
    provider: undefined,
  } as unknown as Booking;

  // Job-scoped messages. Backend exposes GET/POST /v1/jobs/:id/messages;
  // derive jobId from the booking object when present, else show EmptyState.
  const jobId = (liveBooking as unknown as { jobId?: string } | null)?.jobId;
  const { data: jobMessages = [] } = useJobMessages(jobId);
  const sendMessage = useSendJobMessage();

  const provider = booking.provider;

  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [jobMessages]);

  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || !jobId) return;
    sendMessage.mutate({
      jobId,
      from: user?.id || 'customer',
      body: content,
    });
    setInputText('');
    setAttachedImage(null);
  };

  const handleAttachMockImage = () => {
    setAttachedImage('https://images.unsplash.com/photo-1544717305-2782549b5136?w=400');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerProfile}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri:
                  provider?.avatarUrl ||
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              }}
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.technicianName} numberOfLines={1}>
                {provider?.name || 'Technician'}
              </Text>
              <ShieldCheck size={14} color={colors.primary} />
            </View>
            <Text style={styles.onlineStatusText}>Online • Verified Technician</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push(`/chat/call/${booking.id}`)}
          style={styles.callButton}
          accessibilityRole="button"
          accessibilityLabel="Call technician"
        >
          <Phone size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Pinned Order Context Banner */}
      <Pressable
        onPress={() => router.push(`/tracking/${booking.id}`)}
        style={styles.pinnedOrderBanner}
      >
        <View style={styles.pinnedOrderLeft}>
          <Text style={styles.pinnedOrderTitle}>
            Order #{booking.bookingNumber} • {booking.service?.name || 'Service'}
          </Text>
          <Text style={styles.pinnedOrderSub}>
            Status: {booking.status.replace('_', ' ')} • Tap to track
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </Pressable>

      {/* Messages Stream — live job messages; booking-context EmptyState when no jobId. */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.messagesContainer}
      >
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>Today</Text>
        </View>

        {!jobId ? (
          <EmptyState
            title="No conversation yet"
            description={`Order #${booking.bookingNumber || bookingId} has no assigned job thread yet. Messages will appear here once a technician is dispatched.`}
            actionTitle="Track booking"
            onActionPress={() => router.push(`/tracking/${booking.id}`)}
          />
        ) : jobMessages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Start the conversation — your technician will reply here."
          />
        ) : (
          jobMessages.map((item) => {
          const isUser = item.from === (user?.id || 'customer');
          return (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowProvider,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.providerBubble,
                ]}
              >
                {item.body ? (
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userMessageText : styles.providerMessageText,
                    ]}
                  >
                    {item.body}
                  </Text>
                ) : null}

                <View style={styles.timestampRow}>
                  <Text
                    style={[
                      styles.timestampText,
                      isUser ? styles.userTimestampText : styles.providerTimestampText,
                    ]}
                  >
                    {formatTimeWAT(new Date(item.at))}
                  </Text>
                  {isUser && (
                    <CheckCheck
                      size={14}
                      color="#FFFFFF"
                      style={styles.checkIcon}
                    />
                  )}
                </View>
              </View>
            </View>
          );
          })
        )}
      </ScrollView>

      {/* Image attachment preview (if selected) */}
      {attachedImage && (
        <View style={styles.attachmentBar}>
          <Image source={resolveImage(attachedImage)} style={styles.attachmentThumbnail} />
          <Text style={styles.attachmentLabel}>Photo attached</Text>
          <Pressable onPress={() => setAttachedImage(null)} style={styles.removeAttachment}>
            <X size={16} color={colors.textPrimary} />
          </Pressable>
        </View>
      )}

      {/* Quick Responses Chips */}
      <View style={styles.quickResponsesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickResponsesScroll}
        >
          {QUICK_RESPONSES.map((chip, index) => (
            <Pressable
              key={`chip_${index}`}
              onPress={() => handleSendMessage(chip)}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Bottom Message Input Bar */}
      <View style={styles.inputBar}>
        <Pressable
          onPress={handleAttachMockImage}
          style={styles.attachButton}
          accessibilityRole="button"
          accessibilityLabel="Attach photo"
        >
          <Paperclip size={20} color={colors.textSecondary} />
        </Pressable>

        <TextInput
          placeholder="Type message here..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          style={styles.textInput}
        />

        {inputText.trim() || attachedImage ? (
          <Pressable
            onPress={() => handleSendMessage()}
            style={styles.sendButton}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Send size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            style={styles.micButton}
            accessibilityRole="button"
            accessibilityLabel="Voice note"
          >
            <Mic size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 4,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.sm + 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceCard,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  technicianName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  onlineStatusText: {
    ...typography.micro,
    color: colors.success,
    fontWeight: '500',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  pinnedOrderLeft: {
    flex: 1,
  },
  pinnedOrderTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  pinnedOrderSub: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 1,
  },
  messagesContainer: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  dateSeparator: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginBottom: spacing.md,
  },
  dateSeparatorText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  messageRow: {
    marginBottom: spacing.sm + 2,
    flexDirection: 'row',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowProvider: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.xs,
  },
  providerBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
  },
  attachedImagePreview: {
    width: 200,
    height: 140,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.body,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  providerMessageText: {
    color: colors.textPrimary,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timestampText: {
    ...typography.micro,
    fontSize: 10,
  },
  userTimestampText: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  providerTimestampText: {
    color: colors.textMuted,
  },
  checkIcon: {
    marginLeft: 2,
  },
  attachmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  attachmentThumbnail: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    marginRight: spacing.sm,
  },
  attachmentLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  removeAttachment: {
    padding: spacing.xs,
  },
  quickResponsesWrapper: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  quickResponsesScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  quickChip: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 28 : spacing.sm,
  },
  attachButton: {
    padding: spacing.xs + 2,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputFill,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs + 2,
  },
  micButton: {
    padding: spacing.xs + 2,
    marginLeft: spacing.xs,
  },
});

