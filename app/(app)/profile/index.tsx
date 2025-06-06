import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Modal, Alert } from 'react-native';
import { useAuth } from '../../context/auth';
import { Settings, LogOut, Bell, Shield, User, Heart, Plus, Link, X, Calendar, MapPin, Brain, Activity, Phone, Mail, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, signOut, connectToPatient, getPatientDetails } = useAuth();
  const isPatient = user?.role === 'patient';
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [connectedPatients, setConnectedPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Fetch connected patients details
  React.useEffect(() => {
    if (user?.role === 'caretaker' && user.connectedPatients) {
      const patients = user.connectedPatients.map(id => getPatientDetails(id)).filter(Boolean);
      setConnectedPatients(patients);
    }
  }, [user]);

  const handleConnectToPatient = async () => {
    if (!patientId.trim()) {
      Alert.alert('Error', 'Please enter a valid patient ID');
      return <View > Error </View>;
    }

    try {
      await connectToPatient(patientId);
      setConnectModalVisible(false);
      setPatientId('');
      
      // Refresh connected patients
      if (user?.role === 'caretaker' && user.connectedPatients) {
        const patients = user.connectedPatients.map(id => getPatientDetails(id)).filter(Boolean);
        setConnectedPatients(patients);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to patient');
    }
  };

  const showPatientDetails = (patientId: string) => {
    setSelectedPatientId(patientId);
    setDetailsModalVisible(true);
  };

  const PatientProfile = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1551076805-e1869033e561' }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>Patient</Text>
        <View style={styles.idContainer}>
          <Text style={styles.idLabel}>Your ID (for caretaker connection):</Text>
          <Text style={styles.idValue}>{user?.id}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Emergency Contact</Text>
            <Text style={styles.infoValue}>
              {user?.caretakerId ? 'Sarah Caretaker' : 'Not set'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Medical Conditions</Text>
            <Text style={styles.infoValue}>Mild Cognitive Impairment</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Bell color="#4A90E2" size={24} />
            <Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Shield color="#50C878" size={24} />
            <Text style={styles.actionText}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Settings color="#FFB347" size={24} />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Heart color="#FF69B4" size={24} />
            <Text style={styles.actionText}>Health Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <LogOut color="#fff" size={20} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const CaretakerProfile = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>Caretaker</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Patients</Text>
            <Text style={styles.infoValue}>{connectedPatients.length} Active Patient(s)</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Experience</Text>
            <Text style={styles.infoValue}>5 years</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patient Management</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setConnectModalVisible(true)}
          >
            <Plus color="#fff" size={20} />
          </TouchableOpacity>
        </View>
        
        {connectedPatients.length > 0 ? (
          connectedPatients.map((patient) => (
            <View key={patient.id} style={styles.patientCard}>
              <View style={styles.patientHeader}>
                <User color="#4A90E2" size={24} />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientStatus}>Active</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => showPatientDetails(patient.id)}
              >
                <Text style={styles.viewDetailsText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Link color="#666" size={40} />
            <Text style={styles.emptyStateText}>No patients connected</Text>
            <Text style={styles.emptyStateSubtext}>
              Connect to a patient using their ID
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.settingsContainer}>
          <TouchableOpacity style={styles.settingsItem}>
            <Bell color="#666" size={20} />
            <Text style={styles.settingsText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Shield color="#666" size={20} />
            <Text style={styles.settingsText}>Privacy & Security</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Settings color="#666" size={20} />
            <Text style={styles.settingsText}>Preferences</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <LogOut color="#fff" size={20} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1 }}>
      {isPatient ? <PatientProfile /> : <CaretakerProfile />}

      {/* Connect to Patient Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={connectModalVisible}
        onRequestClose={() => setConnectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect to Patient</Text>
              <TouchableOpacity 
                onPress={() => setConnectModalVisible(false)}
                style={styles.closeButton}
              >
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalText}>
              Enter the patient's ID to connect and manage their care
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Patient ID"
              value={patientId}
              onChangeText={setPatientId}
            />
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={handleConnectToPatient}
            >
              <Text style={styles.modalButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Patient Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Details</Text>
              <TouchableOpacity 
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
              >
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>
            
            {selectedPatientId ? (
              <ScrollView style={styles.detailsScrollView}>
                {/* Patient Profile Section */}
                <View style={styles.detailsSection}>
                  <View style={styles.patientProfileHeader}>
                    <Image 
                      source={{ uri: 'https://images.unsplash.com/photo-1551076805-e1869033e561' }} 
                      style={styles.detailsProfileImage} 
                    />
                    <View style={styles.patientProfileInfo}>
                      <Text style={styles.detailsName}>
                        {connectedPatients.find(patient => patient.id === selectedPatientId)?.name}
                      </Text>
                      <View style={styles.patientIdBadge}>
                        <Text style={styles.patientIdText}>ID: {selectedPatientId}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Contact Information */}
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Contact Information</Text>
                  <View style={styles.detailsCard}>
                    <View style={styles.detailsRow}>
                      <Mail color="#4A90E2" size={20} />
                      <Text style={styles.detailsLabel}>Email:</Text>
                      <Text style={styles.detailsValue}>
                        {connectedPatients.find(patient => patient.id === selectedPatientId)?.email}
                      </Text>
                    </View>
                    <View style={styles.detailsDivider} />
                    <View style={styles.detailsRow}>
                      <Phone color="#50C878" size={20} />
                      <Text style={styles.detailsLabel}>Phone:</Text>
                      <Text style={styles.detailsValue}>+1 (555) 123-4567</Text>
                    </View>
                    <View style={styles.detailsDivider} />
                    <View style={styles.detailsRow}>
                      <MapPin color="#FF69B4" size={20} />
                      <Text style={styles.detailsLabel}>Address:</Text>
                      <Text style={styles.detailsValue}>123 Memory Lane, Anytown, CA 94321</Text>
                    </View>
                  </View>
                </View>

                {/* Medical Information */}
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Medical Information</Text>
                  <View style={styles.detailsCard}>
                    <View style={styles.detailsRow}>
                      <Activity color="#4A90E2" size={20} />
                      <Text style={styles.detailsLabel}>Condition:</Text>
                      <Text style={styles.detailsValue}>Early-stage Dementia</Text>
                    </View>
                    <View style={styles.detailsDivider} />
                    <View style={styles.detailsRow}>
                      <Clock color="#FFB347" size={20} />
                      <Text style={styles.detailsLabel}>Diagnosed:</Text>
                      <Text style={styles.detailsValue}>March 2023</Text>
                    </View>
                    <View style={styles.detailsDivider} />
                    <View style={styles.detailsRow}>
                      <Heart color="#FF69B4" size={20} />
                      <Text style={styles.detailsLabel}>Blood Type:</Text>
                      <Text style={styles.detailsValue}>A+</Text>
                    </View>
                  </View>
                </View>

                {/* Emergency Contacts */}
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Emergency Contacts</Text>
                  <View style={styles.detailsCard}>
                    <View style={styles.emergencyContact}>
                      <View style={styles.emergencyContactHeader}>
                        <User color="#4A90E2" size={20} />
                        <Text style={styles.emergencyContactName}>Mary Johnson (Daughter)</Text>
                      </View>
                      <Text style={styles.emergencyContactDetail}>Phone: +1 (555) 987-6543</Text>
                      <Text style={styles.emergencyContactDetail}>Email: mary.j@example.com</Text>
                    </View>
                    <View style={styles.detailsDivider} />
                    <View style={styles.emergencyContact}>
                      <View style={styles.emergencyContactHeader}>
                        <User color="#4A90E2" size={20} />
                        <Text style={styles.emergencyContactName}>Robert Smith (Son)</Text>
                      </View>
                      <Text style={styles.emergencyContactDetail}>Phone: +1 (555) 456-7890</Text>
                      <Text style={styles.emergencyContactDetail}>Email: robert.s@example.com</Text>
                    </View>
                  </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Recent Activity</Text>
                  <View style={styles.detailsCard}>
                    <View style={styles.activityItem}>
                      <View style={styles.activityIcon}>
                        <Brain color="#fff" size={16} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle}>Memory Game</Text>
                        <Text style={styles.activityTime}>Today, 10:30 AM</Text>
                        <Text style={styles.activityDetail}>Completed with 85% accuracy</Text>
                      </View>
                    </View>
                    <View style={styles.detailsDivider} />
                    <View style={styles.activityItem}>
                      <View style={[styles.activityIcon, styles.walkIcon]}>
                        <MapPin color="#fff" size={16} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle}>Morning Walk</Text>
                        <Text style={styles.activityTime}>Yesterday, 9:15 AM</Text>
                        <Text style={styles.activityDetail}>Completed 0.8 miles</Text>
                      </View>
                    </View>
                    <View style={styles.detailsDivider} />
                    <View style={styles.activityItem}>
                      <View style={[styles.activityIcon, styles.medicationIcon]}>
                        <Bell color="#fff" size={16} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle}>Medication</Text>
                        <Text style={styles.activityTime}>Yesterday, 8:00 AM</Text>
                        <Text style={styles.activityDetail}>Took morning medication</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Notes & Alerts */}
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Notes & Alerts</Text>
                  <View style={styles.alertCard}>
                    <AlertTriangle color="#FF6B6B" size={20} />
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>Medication Reminder</Text>
                      <Text style={styles.alertDescription}>
                        Patient sometimes forgets evening medication. Extra reminder needed.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.noteCard}>
                    <Calendar color="#4A90E2" size={20} />
                    <View style={styles.noteContent}>
                      <Text style={styles.noteTitle}>Doctor's Appointment</Text>
                      <Text style={styles.noteDescription}>
                        Scheduled for June 15, 2025 at 2:30 PM with Dr. Williams.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.detailsActionButtons}>
                  <TouchableOpacity style={styles.detailsActionButton}>
                    <Calendar color="#fff" size={20} />
                    <Text style={styles.detailsActionText}>Schedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailsActionButton, styles.messageButton]}>
                    <Mail color="#fff" size={20} />
                    <Text style={styles.detailsActionText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.modalText}>No details available</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  idContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  idLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  idValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 15,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  patientInfo: {
    marginLeft: 15,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  patientStatus: {
    fontSize: 14,
    color: '#4A90E2',
  },
  viewDetailsButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingsText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
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
  detailsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Patient Details Modal Styles
  detailsScrollView: {
    padding: 20,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  patientProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailsProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  patientProfileInfo: {
    marginLeft: 15,
    flex: 1,
  },
  detailsName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  patientIdBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  patientIdText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailsLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 10,
    width: 80,
  },
  detailsValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  emergencyContact: {
    paddingVertical: 8,
  },
  emergencyContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  emergencyContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  emergencyContactDetail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 30,
    marginTop: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walkIcon: {
    backgroundColor: '#50C878',
  },
  medicationIcon: {
    backgroundColor: '#FFB347',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  activityDetail: {
    fontSize: 14,
    color: '#666',
  },
  alertCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noteCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  noteContent: {
    marginLeft: 12,
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  noteDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailsActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  detailsActionButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageButton: {
    backgroundColor: '#50C878',
    marginRight: 0,
  },
  detailsActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});