import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import userService from '../services/userservice';

export default function ProfileSetupScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    bio: '',
    location: '',
    interests: '',
    photos: [''], // Start with one photo field
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addPhotoField = () => {
    if (profile.photos.length < 6) { // Max 6 photos
      setProfile(prev => ({
        ...prev,
        photos: [...prev.photos, '']
      }));
    }
  };

  const updatePhoto = (index: number, url: string) => {
    const newPhotos = [...profile.photos];
    newPhotos[index] = url;
    setProfile(prev => ({
      ...prev,
      photos: newPhotos
    }));
  };

  const removePhoto = (index: number) => {
    if (profile.photos.length > 1) {
      const newPhotos = profile.photos.filter((_, i) => i !== index);
      setProfile(prev => ({
        ...prev,
        photos: newPhotos
      }));
    }
  };

  const validateProfile = () => {
    if (!profile.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    
    const age = parseInt(profile.age);
    if (!age || age < 18 || age > 100) {
      Alert.alert('Error', 'Please enter a valid age (18-100)');
      return false;
    }
    
    if (!profile.bio.trim()) {
      Alert.alert('Error', 'Please write a bio');
      return false;
    }
    
    if (!profile.location.trim()) {
      Alert.alert('Error', 'Please enter your location');
      return false;
    }
    
    if (!profile.interests.trim()) {
      Alert.alert('Error', 'Please enter your interests');
      return false;
    }
    
    const validPhotos = profile.photos.filter(photo => photo.trim());
    if (validPhotos.length === 0) {
      Alert.alert('Error', 'Please add at least one photo URL');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateProfile()) return;
    
    setIsSubmitting(true);
    
    try {
      const profileData = {
        ...profile,
        age: parseInt(profile.age),
        interests: profile.interests.split(',').map(i => i.trim()),
        photos: profile.photos.filter(photo => photo.trim())
      };
      
      const response = await userService.createProfile(profileData);
      
      if (response.success) {
        // Also log all users to console for verification
        const allUsers = await userService.getAllUsers();
        console.log(`✅ Profile created! Total users in database: ${allUsers.total_count}`);
        
        Alert.alert(
          'Success!', 
          `Your profile has been created. Welcome to Thrizll!\n\nDatabase now has ${allUsers.total_count} users.`,
          [
            {
              text: 'Start Discovering',
              onPress: () => navigation.navigate('MainTabs' as never)
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to create profile');
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Your Profile</Text>
        <Text style={styles.subtitle}>Let others get to know you!</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={profile.name}
            onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
            placeholder="Enter your name"
            maxLength={50}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            value={profile.age}
            onChangeText={(text) => setProfile(prev => ({ ...prev, age: text }))}
            placeholder="Enter your age"
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.bio}
            onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
            maxLength={300}
          />
          <Text style={styles.charCount}>{profile.bio.length}/300</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            value={profile.location}
            onChangeText={(text) => setProfile(prev => ({ ...prev, location: text }))}
            placeholder="City, State"
            maxLength={100}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interests * (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={profile.interests}
            onChangeText={(text) => setProfile(prev => ({ ...prev, interests: text }))}
            placeholder="e.g. hiking, coffee, music, travel"
            maxLength={200}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photos * (URLs)</Text>
          {profile.photos.map((photo, index) => (
            <View key={index} style={styles.photoInputContainer}>
              <TextInput
                style={[styles.input, styles.photoInput]}
                value={photo}
                onChangeText={(text) => updatePhoto(index, text)}
                placeholder={`Photo URL ${index + 1}`}
              />
              {profile.photos.length > 1 && (
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {profile.photos.length < 6 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhotoField}>
              <Text style={styles.addPhotoText}>+ Add Another Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Creating Profile...' : 'Create Profile & Start Matching!'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: '#ff6b6b',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  photoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoInput: {
    flex: 1,
  },
  removePhotoBtn: {
    marginLeft: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPhotoBtn: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#ff6b6b',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#ff6b6b',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
