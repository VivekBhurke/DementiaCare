import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../context/auth';
import { 
  Send, 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  X, 
  Bot, 
  MessageSquare,
  Headphones,
  Square
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Message } from '@/app/types/auth';
import { GoogleGenerativeAI } from "@google/generative-ai"
import * as FileSystem from "expo-file-system"

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceOnlyMode, setVoiceOnlyMode] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);
  const genAI = new GoogleGenerativeAI("AIzaSyCqC2-pYbWeLmymK9ST5gemOYlaFOFDOfg");
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  useEffect(() => {
    // Load initial welcome message
    const initialMessages: Message[] = [
      {
        id: '1',
        text: "Hello!",
        sender: 'ai',
        timestamp: new Date(),
        isVoice: false
      }
    ];

    setMessages(initialMessages);

    // If in voice-only mode, speak the welcome message
    if (voiceOnlyMode) {
      setTimeout(() => {
        Speech.speak(initialMessages[0].text, {
          language: 'en',
          pitch: 1.0,
          rate: 0.9
        });
      }, 500);
    }

    // Request audio recording permissions
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need audio recording permissions to make this work!');
        }
      }
    })();

    // Clean up speech and audio on unmount
    return () => {
      if (Speech.isSpeakingAsync()) {
        Speech.stop();
      }
      
      if (sound) {
        sound.unloadAsync();
      }
      
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Effect for voice-only mode changes
  useEffect(() => {
    if (voiceOnlyMode) {
      // When switching to voice-only mode, speak the last AI message
      const lastAiMessage = [...messages].reverse().find(m => m.sender === 'ai');
      if (lastAiMessage) {
        Speech.speak(lastAiMessage.text, {
          language: 'en',
          pitch: 1.0,
          rate: 0.9
        });
      }
    } else {
      // When switching back to normal mode, stop any ongoing speech
      Speech.stop();
    }
  }, [voiceOnlyMode]);

  const getAIResponse = async (userMessage: string) => {
    setIsLoading(true);
    
    try {
      const aiResponse = await model.generateContent("You are an AI assistant interacting with a dementia patient. Your tone should always be polite, warm, and friendly. Communicate in the patient's preferred language and keep the conversation natural and engaging. Avoid technical language, brackets, or any hints that you are an AI—your responses should feel as human as possible. Your priority is to make the patient feel comfortable, understood, and valued. If you recieve any bas364 file it is an audio file and reply to it in marathi only \n"+userMessage);
      setIsLoading(false);
      return aiResponse.response.text();
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setIsLoading(false);  // Important: Set loading to false even on error
      return "Error: Could not get AI response"; // Return a default value or handle the error appropriately
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return <View > Error </View>;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      isVoice: false
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Get AI response
    const aiResponse = await getAIResponse(newMessage.text);
    
    const responseMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      sender: 'ai',
      timestamp: new Date(),
      isVoice: false
    };

    setMessages(prev => [...prev, responseMessage]);

    // If in voice-only mode, speak the AI response
    if (voiceOnlyMode) {
      Speech.speak(aiResponse, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9
      });
    }
  };

  const startRecording = async () => {
    try {
      // Clear previous recording if any
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      
      // Prepare recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Start new recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setShowVoiceModal(true);
      
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    
    setIsRecording(false);
    setShowVoiceModal(false);

    if(!recording) return <View > Error </View>;
    
    try {
      // Stop recording
      await recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      
      const uri = recording.getURI();
      
      // Create a voice message with the recording
      if (uri) {
        const audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const newVoiceMessage: Message = {
          id: Date.now().toString(),
          text: "Voice message", // Placeholder text
          sender: 'user',
          timestamp: new Date(),
          isVoice: true,
          voiceDuration: recordingTime,
          audioUri: uri
        };
        
        setMessages(prev => [...prev, newVoiceMessage]);

        const aiResponse = await getAIResponse(audio);
        
        // Get AI response
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
          isVoice: false
        };
        
        setMessages(prev => [...prev, responseMessage]);
        
        // If in voice-only mode, automatically speak the AI response
        if (voiceOnlyMode) {
          Speech.speak(aiResponse, {
            language: 'en',
            pitch: 1.0,
            rate: 0.9
          });
        }
      }
      
      // Reset recording state
      setRecording(null);
      
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      // Ensure these states are reset even if there's an error
      setIsRecording(false);
      setShowVoiceModal(false);
      setRecordingTime(0);
    }
  };

  const handleStartRecording = () => {
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleCancelRecording = async () => {
    
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      } catch (err) {
        console.error('Failed to cancel recording', err);
      }
    }
    
    setIsRecording(false);
    setShowVoiceModal(false);
    setRecordingTime(0);
  };

  const handlePlayVoice = async (messageId: string, text: string, audioUri?: string) => {
    // If there's already something playing, stop it
    if (isPlaying) {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      Speech.stop();
      setIsPlaying(null);
      setIsSpeaking(null);
      return <View > Error </View>;
    }

    // If the message is already playing, stop it
    if (isPlaying === messageId) {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      Speech.stop();
      setIsPlaying(null);
      setIsSpeaking(null);
      return <View > Error </View>;
    }

    setIsPlaying(messageId);
    setIsSpeaking(messageId);

    // If it's a voice message with audio URI, play the audio
    if (audioUri) {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        
        setSound(newSound);
        
        // Listen for playback status updates
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(null);
            setIsSpeaking(null);
            newSound.unloadAsync();
            setSound(null);
          }
        });
      } catch (err) {
        console.error('Failed to play audio', err);
        setIsPlaying(null);
        setIsSpeaking(null);
      }
    } else {
      // Otherwise, use text-to-speech
      Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          setIsPlaying(null);
          setIsSpeaking(null);
        },
        onStopped: () => {
          setIsPlaying(null);
          setIsSpeaking(null);
        }
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleVoiceOnlyMode = () => {
    setVoiceOnlyMode(!voiceOnlyMode);
  };

  // Voice-only mode UI
  const VoiceOnlyUI = () => (
    <View style={styles.voiceOnlyContainer}>
      <View style={styles.voiceOnlyHeader}>
        <Bot size={60} color="#4A90E2" />
        <Text style={styles.voiceOnlyTitle}>Voice Assistant</Text>
        <Text style={styles.voiceOnlySubtitle}>
          {isRecording ? "Listening..." : isSpeaking ? "Speaking..." : "Tap and hold the microphone to speak"}
        </Text>
      </View>

      <View style={styles.voiceWaveContainer}>
        {isRecording || isSpeaking ? (
          <View style={styles.waveformLarge}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.waveformBarLarge,
                  { 
                    height: Math.random() * 60 + 10,
                    opacity: 0.7 + Math.random() * 0.3
                  }
                ]} 
              />
            ))}
          </View>
        ) : (
          <Text style={styles.voicePrompt}>
            "Try saying: What activities do I have today?"
          </Text>
        )}
      </View>

      <View style={styles.voiceControlsContainer}>
        <TouchableOpacity 
          style={styles.voiceButton}
          onPress={handleStartRecording}
        >
          <Mic size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.stopButton}
          onPress={handleStopRecording}
        >
          <Square size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.switchModeButton}
        onPress={toggleVoiceOnlyMode}
      >
        <MessageSquare size={20} color="#4A90E2" />
        <Text style={styles.switchModeText}>Switch to Text Chat</Text>
      </TouchableOpacity>
    </View>
  );

  // Normal chat UI
  const NormalChatUI = () => (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Bot size={24} color="#4A90E2" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>AI Assistant</Text>
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.switchModeButtonSmall}
          onPress={toggleVoiceOnlyMode}
        >
          <Headphones size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View 
            key={message.id}
            style={[
              styles.messageWrapper,
              message.sender === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper
            ]}
          >
            <View 
              style={[
                styles.messageBubble,
                message.sender === 'user' ? styles.userMessage : styles.aiMessage,
                message.isVoice && styles.voiceMessageBubble
              ]}
            >
              {message.isVoice ? (
                <TouchableOpacity 
                  style={styles.voiceMessageContent}
                  onPress={() => handlePlayVoice(message.id, message.text, message.audioUri)}
                >
                  {isPlaying === message.id ? (
                    <Pause size={20} color={message.sender === 'user' ? '#fff' : '#333'} />
                  ) : (
                    <Play size={20} color={message.sender === 'user' ? '#fff' : '#333'} />
                  )}
                  <View style={styles.voiceWaveform}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <View 
                        key={i} 
                        style={[
                          styles.waveformBar,
                          { 
                            height: Math.random() * 15 + 5,
                            backgroundColor: message.sender === 'user' ? '#fff' : '#333',
                            opacity: isPlaying === message.id ? 0.7 + Math.random() * 0.3 : 0.5
                          }
                        ]} 
                      />
                    ))}
                  </View>
                  <Text 
                    style={[
                      styles.voiceDuration,
                      message.sender === 'user' ? styles.userVoiceDuration : styles.aiVoiceDuration
                    ]}
                  >
                    {message.voiceDuration ? formatTime(message.voiceDuration) : '0:00'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text 
                  style={[
                    styles.messageText,
                    message.sender === 'user' ? styles.userMessageText : styles.aiMessageText
                  ]}
                >
                  {message.text}
                </Text>
              )}
            </View>
            <Text style={styles.messageTime}>
              {formatMessageTime(message.timestamp)}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

    </KeyboardAvoidingView>
  );

  // Redirect non-patients to home
  if (user?.role !== 'patient') {
    return <Redirect href="/home" />;
  }

  return (
    <View style={styles.container}>
      {voiceOnlyMode ? <VoiceOnlyUI /> :
      <>
      <NormalChatUI />
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        {inputText.trim() !== '' ? (
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.micButton} 
            onPress={handleStartRecording}
          >
            <Mic size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelRecording}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.recordingTitle}>Listening...</Text>
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, isRecording && styles.recordingDotActive]} />
              <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
            </View>
            <View style={styles.waveformLarge}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.waveformBarLarge,
                    { 
                      height: Math.random() * 40 + 5,
                      opacity: 0.7 + Math.random() * 0.3
                    }
                  ]} 
                />
              ))}
            </View>
            <View style={styles.recordingControls}>
              <TouchableOpacity 
                style={styles.cancelRecordingButton} 
                onPress={handleCancelRecording}
              >
                <X size={24} color="#ff3b30" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.stopRecordingButton} 
                onPress={handleStopRecording}
              >
                <MicOff size={24} color="#fff" />
                <Text style={styles.stopButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  switchModeButtonSmall: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 30,
  },
  messageWrapper: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
  },
  aiMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    minWidth: 80,
  },
  userMessage: {
    backgroundColor: '#4A90E2',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  micButton: {
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  voiceMessageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  voiceMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    height: 20,
  },
  waveformBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 3,
  },
  voiceDuration: {
    fontSize: 12,
    marginLeft: 5,
  },
  userVoiceDuration: {
    color: '#fff',
  },
  aiVoiceDuration: {
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  recordingDotActive: {
    backgroundColor: '#ff3b30',
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  cancelRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    marginLeft: 5,
    color: '#ff3b30',
    fontWeight: '600',
  },
  stopRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
  },
  stopButtonText: {
    marginLeft: 5,
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 18,
    marginBottom: 15,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  // Voice-only mode styles
  voiceOnlyContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'space-between',
    padding: 20,
  },
  voiceOnlyHeader: {
    alignItems: 'center',
    marginTop: 40,
  },
  voiceOnlyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  voiceOnlySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  voiceWaveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voicePrompt: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  waveformLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  waveformBarLarge: {
    width: 5,
    marginHorizontal: 2,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
  },
  voiceControlsContainer: {
    alignItems: 'center',
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  voiceButton: {
    backgroundColor: '#4A90E2',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 20,
  },
  switchModeText: {
    marginLeft: 8,
    color: '#4A90E2',
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#ff3b30',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  }
});