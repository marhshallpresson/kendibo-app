import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react-native';
import { useBooking } from '../../../services/queryClient';
import { Booking } from '../../../types';
import { darkColors as colors, spacing, typography, radii } from '../../../constants/theme';
import { avatarSource } from '../../../constants/images';

export default function VoiceCallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Load booking / provider
  const { data: booking } = useBooking(typeof id === 'string' ? id : '');

  const provider = booking?.provider;

  const [callStatus, setCallStatus] = useState<'ringing' | 'connected'>('ringing');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);

  useEffect(() => {
    // Ring for 2.5 seconds, then transition to connected
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 2500);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleEndCall = () => {
    router.back();
  };

  return (
    <View style={styles.screen}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.encryptionBadge}>
          <ShieldCheck size={14} color="#07BD74" />
          <Text style={styles.encryptionText}>End-to-End Encrypted via KENDIBO</Text>
        </View>
      </View>

      {/* Center Caller Profile */}
      <View style={styles.centerContainer}>
        <View style={styles.avatarPulsingContainer}>
          <View style={styles.outerPulseRing} />
          <View style={styles.innerPulseRing} />
          <Image source={avatarSource(provider?.avatarUrl)} style={styles.avatar} />
        </View>

        <Text style={styles.callerName}>{provider?.name || 'Assigned Technician'}</Text>
        <Text style={styles.callerRole}>
          {booking?.service?.name || 'Home Maintenance'} • #{booking?.bookingNumber}
        </Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {callStatus === 'ringing' ? 'Calling...' : formatTimer(secondsElapsed)}
          </Text>
        </View>
      </View>

      {/* Control Buttons Grid */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setIsMuted((prev) => !prev)}
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            accessibilityRole="button"
            accessibilityLabel="Mute"
          >
            {isMuted ? <MicOff size={24} color="#FFFFFF" /> : <Mic size={24} color="#FFFFFF" />}
            <Text style={styles.controlLabel}>{isMuted ? 'Muted' : 'Mute'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setIsSpeakerOn((prev) => !prev)}
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            accessibilityRole="button"
            accessibilityLabel="Speaker"
          >
            {isSpeakerOn ? (
              <Volume2 size={24} color="#246BFD" />
            ) : (
              <VolumeX size={24} color="#FFFFFF" />
            )}
            <Text style={styles.controlLabel}>{isSpeakerOn ? 'Speaker ON' : 'Speaker'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setIsVideoOn((prev) => !prev)}
            style={[styles.controlButton, isVideoOn && styles.controlButtonActive]}
            accessibilityRole="button"
            accessibilityLabel="Video"
          >
            {isVideoOn ? <Video size={24} color="#246BFD" /> : <VideoOff size={24} color="#FFFFFF" />}
            <Text style={styles.controlLabel}>{isVideoOn ? 'Video ON' : 'Video'}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/chat/${booking?.id}`)}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel="Chat"
          >
            <MessageSquare size={24} color="#FFFFFF" />
            <Text style={styles.controlLabel}>Message</Text>
          </Pressable>
        </View>

        {/* Big Red Hang Up Button */}
        <View style={styles.endCallWrapper}>
          <Pressable
            onPress={handleEndCall}
            style={styles.endCallButton}
            accessibilityRole="button"
            accessibilityLabel="End call"
          >
            <PhoneOff size={32} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#121418',
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: spacing.md,
  },
  topBar: {
    alignItems: 'center',
    paddingTop: 10,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 6,
  },
  encryptionText: {
    ...typography.micro,
    color: '#07BD74',
    fontWeight: '600',
  },
  centerContainer: {
    alignItems: 'center',
  },
  avatarPulsingContainer: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.lg,
  },
  outerPulseRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(36, 107, 253, 0.12)',
  },
  innerPulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(36, 107, 253, 0.22)',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  callerName: {
    ...typography.h2,
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  callerRole: {
    ...typography.body,
    color: '#A0A4AE',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statusPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  statusText: {
    ...typography.title,
    fontSize: 16,
    color: '#246BFD',
    fontWeight: '600',
  },
  controlsContainer: {
    paddingBottom: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  controlButton: {
    alignItems: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  controlLabel: {
    ...typography.micro,
    color: '#A0A4AE',
    marginTop: 6,
    textAlign: 'center',
  },
  endCallWrapper: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F75555',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F75555',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});


