import React, { useEffect, useState, useCallback } from 'react';
import { ModoVoiceClient, EventType, AudioDeviceInfo, VoiceActivityMetrics } from '../src';

interface VoiceChatProps {
  chatbotUuid: string;
  userUniqueId: string;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ chatbotUuid, userUniqueId }) => {
  const [client] = useState(() => new ModoVoiceClient({
    apiBase: 'https://live.modochats.com',
    chatbotUuid,
    userUniqueId
  }));

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceActivityMetrics | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const availableDevices = await client.getAvailableDevices();
        setDevices(availableDevices);
        if (availableDevices.length > 0) {
          setSelectedDevice(availableDevices[0].deviceId);
        }
      } catch (err) {
        setError('Failed to load audio devices');
      }
    };

    loadDevices();
  }, [client]);

  useEffect(() => {
    const unsubscribers = [
      client.on(EventType.CONNECTED, () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError('');
      }),

      client.on(EventType.DISCONNECTED, () => {
        setIsConnected(false);
        setIsConnecting(false);
      }),

      client.on(EventType.CONNECTION_ERROR, (event) => {
        setError(event.message);
        setIsConnecting(false);
      }),

      client.on(EventType.TRANSCRIPT_RECEIVED, (event) => {
        setTranscript(event.text);
      }),

      client.on(EventType.AI_RESPONSE_RECEIVED, (event) => {
        setAiResponse(event.text);
      }),

      client.on(EventType.VOICE_METRICS, (event) => {
        setVoiceMetrics({
          rms: event.rms,
          db: event.db,
          isActive: event.isActive,
          isPaused: event.isPaused,
          noiseFloor: event.noiseFloor,
          threshold: event.threshold
        });
      }),

      client.on(EventType.AI_PLAYBACK_STARTED, () => {
        setIsAiSpeaking(true);
      }),

      client.on(EventType.AI_PLAYBACK_COMPLETED, () => {
        setIsAiSpeaking(false);
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
      client.disconnect();
    };
  }, [client]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      await client.connect(selectedDevice || undefined);
    } catch (err) {
      setError(`Connection failed: ${(err as Error).message}`);
      setIsConnecting(false);
    }
  }, [client, selectedDevice]);

  const handleDisconnect = useCallback(async () => {
    try {
      await client.disconnect();
    } catch (err) {
      setError(`Disconnect failed: ${(err as Error).message}`);
    }
  }, [client]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎙️ Modo Voice Chat</h1>
      
      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fee', 
          color: '#c00', 
          borderRadius: '8px',
          marginBottom: '20px' 
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Select Microphone:
        </label>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          disabled={isConnected || isConnecting}
          style={{
            padding: '10px',
            width: '100%',
            borderRadius: '8px',
            border: '2px solid #ddd'
          }}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isConnected ? '#dc3545' : '#28a745',
            color: 'white',
            cursor: isConnecting ? 'wait' : 'pointer',
            width: '100%'
          }}
        >
          {isConnecting ? '🔄 Connecting...' : isConnected ? '🔴 Disconnect' : '🟢 Connect'}
        </button>
      </div>

      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        marginBottom: '20px' 
      }}>
        <h3 style={{ marginTop: 0 }}>Status</h3>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <div style={{ fontSize: '18px' }}>
          AI: {isAiSpeaking ? '🤖 Speaking...' : '⏸ Idle'}
        </div>
      </div>

      {voiceMetrics && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e7f3ff', 
          borderRadius: '8px',
          marginBottom: '20px' 
        }}>
          <h3 style={{ marginTop: 0 }}>Voice Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <strong>RMS:</strong> {voiceMetrics.rms.toFixed(4)}
            </div>
            <div>
              <strong>dB:</strong> {voiceMetrics.db.toFixed(1)}
            </div>
            <div>
              <strong>Active:</strong> {voiceMetrics.isActive ? '🎤 Yes' : '⏸ No'}
            </div>
            <div>
              <strong>Paused:</strong> {voiceMetrics.isPaused ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      )}

      {transcript && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '8px',
          marginBottom: '20px' 
        }}>
          <h3 style={{ marginTop: 0 }}>📝 You said:</h3>
          <p style={{ margin: 0, fontSize: '16px' }}>{transcript}</p>
        </div>
      )}

      {aiResponse && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#d4edda', 
          borderRadius: '8px' 
        }}>
          <h3 style={{ marginTop: 0 }}>💬 AI responded:</h3>
          <p style={{ margin: 0, fontSize: '16px' }}>{aiResponse}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;

