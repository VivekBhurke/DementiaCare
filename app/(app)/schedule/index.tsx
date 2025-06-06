import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useAuth } from '../../context/auth';
import { Clock, Plus, X, Calendar, Bell, Brain, MapPin, Utensils } from 'lucide-react-native';
import { ScheduleItem } from '@/app/types/auth';

export default function ScheduleScreen() {
  const { user, getPatientDetails, getSchedule, addScheduleItem, updateScheduleItemStatus } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [connectedPatients, setConnectedPatients] = useState<any[]>([]);
  
  // Form state
  const [itemTitle, setItemTitle] = useState('');
  const [itemTime, setItemTime] = useState('');
  const [itemType, setItemType] = useState('activity');

  const isPatient = user?.role === 'patient';

  useEffect(() => {
    // Get connected patients if caretaker
    if (user?.role === 'caretaker' && user.connectedPatients) {
      const patients = user.connectedPatients.map(id => getPatientDetails(id)).filter(Boolean);
      setConnectedPatients(patients);
      if (patients.length > 0 && !selectedPatientId && patients[0]) {
        setSelectedPatientId(patients[0].id);
      }
    }

    // Get schedule for the appropriate user
    const patientId = isPatient ? user?.id : selectedPatientId;
    if (patientId) {
      const patientSchedule = getSchedule(patientId);
      setSchedule(patientSchedule);
    }
  }, [user, selectedPatientId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    schedule.forEach((item) => {
      const itemTime = new Date();
      const match = item.time.match(/(\d+):(\d+)\s(AM|PM)/);
      if (match) {
        let [_, hour, minute, period] = match;
        let hours = parseInt(hour, 10);
        const minutes = parseInt(minute, 10);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        itemTime.setHours(hours, minutes, 0);
      }
      
      if (
        itemTime.getHours() === currentTime.getHours() &&
        itemTime.getMinutes() === currentTime.getMinutes()
      ) {
        Alert.alert('Reminder', `It's time for: ${item.title}`);
      }
    });
  }, [currentTime, schedule]);

  const handleAddScheduleItem = async () => {
    if (!itemTitle.trim() || !itemTime.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return <View > Error </View>;
    }

    // Validate time format (HH:MM AM/PM)
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s(AM|PM)$/;
    if (!timeRegex.test(itemTime)) {
      Alert.alert('Error', 'Please enter time in format: HH:MM AM/PM');
      return <View > Error </View>;
    }

    try {
      const patientId = isPatient ? user?.id : selectedPatientId;
      if (!patientId) {
        Alert.alert('Error', 'No patient selected');
        return <View > Error </View>;;
      }

      await addScheduleItem({
        time: itemTime,
        title: itemTitle,
        type: itemType,
        completed: false,
        patientId,
      });

      // Refresh schedule
      const updatedSchedule = getSchedule(patientId);
      setSchedule(updatedSchedule);
      
      // Reset form
      setItemTitle('');
      setItemTime('');
      setItemType('activity');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add schedule item');
    }
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patientSchedule = getSchedule(patientId);
    setSchedule(patientSchedule);
  };

  const handleMarkComplete = async (itemId: string) => {
    try {
      await updateScheduleItemStatus(itemId, true);
      
      // Update local state
      setSchedule(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, completed: true } : item
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update item status');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return <Bell size={16} color="#ff9500" />;
      case 'activity':
        return <Brain size={16} color="#4A90E2" />;
      case 'exercise':
        return <MapPin size={16} color="#50C878" />;
      case 'meal':
        return <Utensils size={16} color="#FF69B4" />;
      default:
        return <Calendar size={16} color="#666" />;
    }
  };

  const PatientSchedule = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Schedule</Text>
        <Text style={styles.headerDate}>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      <View style={styles.timeline}>
        {schedule.length > 0 ? (
          schedule.map((item) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{item.time}</Text>
                <View style={styles.timelineConnector} />
              </View>
              <View style={[styles.eventCard, item.completed && styles.eventCompleted]}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  {getTypeIcon(item.type)}
                </View>
                <View style={styles.eventMeta}>
                  <Clock size={16} color="#666" />
                  <Text style={styles.eventDuration}>30 mins</Text>
                </View>
                {!item.completed && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleMarkComplete(item.id)}
                  >
                    <Text style={styles.completeButtonText}>Mark Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={40} color="#666" />
            <Text style={styles.emptyStateText}>No schedule items</Text>
            <Text style={styles.emptyStateSubtext}>
              Your caretaker will add activities to your schedule
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const CaretakerSchedule = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Schedule Management</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Plus color="#fff" size={20} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerDate}>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>

      {connectedPatients.length > 0 && (
        <View style={styles.patientSelector}>
          <Text style={styles.selectorLabel}>Select Patient:</Text>
          <View style={styles.patientButtons}>
            {connectedPatients.map(patient => (
              <TouchableOpacity
                key={patient.id}
                style={[
                  styles.patientButton,
                  selectedPatientId === patient.id && styles.patientButtonActive
                ]}
                onPress={() => handlePatientChange(patient.id)}
              >
                <Text 
                  style={[
                    styles.patientButtonText,
                    selectedPatientId === patient.id && styles.patientButtonTextActive
                  ]}
                >
                  {patient.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.timeline}>
        {schedule.length > 0 ? (
          schedule.map((item) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{item.time}</Text>
                <View style={styles.timelineConnector} />
              </View>
              <View style={[styles.eventCard, item.completed && styles.eventCompleted]}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  {getTypeIcon(item.type)}
                </View>
                <View style={styles.eventMeta}>
                  <Clock size={16} color="#666" />
                  <Text style={styles.eventDuration}>30 mins</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {item.completed ? 'Completed' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={40} color="#666" />
            <Text style={styles.emptyStateText}>No schedule items</Text>
            <Text style={styles.emptyStateSubtext}>
              Add activities to the patient's schedule
            </Text>
          </View>
        )}
      </View>

      
    </ScrollView>
  );

  return (
    isPatient ? <PatientSchedule /> : 
    <>
      <CaretakerSchedule />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Schedule Item</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Morning Medication"
                value={itemTitle}
                onChangeText={setItemTitle}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Time (HH:MM AM/PM)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 08:00 AM"
                value={itemTime}
                onChangeText={setItemTime}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === 'medication' && styles.typeButtonActive
                  ]}
                  onPress={() => setItemType('medication')}
                >
                  <Bell size={16} color={itemType === 'medication' ? "#fff" : "#ff9500"} />
                  <Text style={[
                    styles.typeButtonText,
                    itemType === 'medication' && styles.typeButtonTextActive
                  ]}>Medication</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === 'activity' && styles.typeButtonActive
                  ]}
                  onPress={() => setItemType('activity')}
                >
                  <Brain size={16} color={itemType === 'activity' ? "#fff" : "#4A90E2"} />
                  <Text style={[
                    styles.typeButtonText,
                    itemType === 'activity' && styles.typeButtonTextActive
                  ]}>Activity</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === 'exercise' && styles.typeButtonActive
                  ]}
                  onPress={() => setItemType('exercise')}
                >
                  <MapPin size={16} color={itemType === 'exercise' ? "#fff" : "#50C878"} />
                  <Text style={[
                    styles.typeButtonText,
                    itemType === 'exercise' && styles.typeButtonTextActive
                  ]}>Exercise</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === 'meal' && styles.typeButtonActive
                  ]}
                  onPress={() => setItemType('meal')}
                >
                  <Utensils size={16} color={itemType === 'meal' ? "#fff" : "#FF69B4"} />
                  <Text style={[
                    styles.typeButtonText,
                    itemType === 'meal' && styles.typeButtonTextActive
                  ]}>Meal</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddScheduleItem}
            >
              <Text style={styles.submitButtonText}>Add to Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  timeline: {
    padding: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timeColumn: {
    width: 80,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timelineConnector: {
    width: 2,
    flexGrow: 1,
    backgroundColor: '#ddd',
    marginTop: 5,
    minHeight: 20,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginLeft: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  eventDuration: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  eventCompleted: {
    backgroundColor: '#d3f9d8',
    opacity: 0.8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#4A90E2',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientSelector: {
    padding: 20,
    paddingTop: 0,
  },
  selectorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  patientButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patientButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  patientButtonActive: {
    backgroundColor: '#4A90E2',
  },
  patientButtonText: {
    color: '#666',
    fontSize: 14,
  },
  patientButtonTextActive: {
    color: '#fff',
  },
  statusBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    margin: 4,
  },
  typeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});