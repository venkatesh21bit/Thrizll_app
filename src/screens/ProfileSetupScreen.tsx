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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import userService from '../services/userservice';

export default function ProfileSetupScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    bio: '',
    location: '',
    interests: '',
    photos: [] as string[], // Array of photo URIs
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload photos!'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    if (profile.photos.length >= 6) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 6 photos');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhotos = [...profile.photos, result.assets[0].uri];
        setProfile(prev => ({
          ...prev,
          photos: newPhotos
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = profile.photos.filter((_, i) => i !== index);
    setProfile(prev => ({
      ...prev,
      photos: newPhotos
    }));
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
    
    if (profile.photos.length === 0) {
      Alert.alert('Error', 'Please add at least one photo');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateProfile()) return;
    
    setIsSubmitting(true);
    
    try {
      // For now, convert photo URIs to placeholder URLs since backend expects URLs
      // In a real app, you'd upload the images to a server first
      const photoUrls = profile.photos.map((_, index) => 
        `https://picsum.photos/400/500?random=${Date.now()}_${index}`
      );
      
      const profileData = {
        ...profile,
        age: parseInt(profile.age),
        interests: profile.interests.split(',').map(i => i.trim()),
        photos: photoUrls
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
          <Text style={styles.label}>Photos * (Upload from device)</Text>
          
          {/* Display selected photos */}
          <View style={styles.photosGrid}>
            {profile.photos.map((photo, index) => (
              <View key={index} style={styles.photoPreviewContainer}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          
          {/* Add photo button */}
          {profile.photos.length < 6 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
              <Text style={styles.addPhotoText}>
                📷 {profile.photos.length === 0 ? 'Add Photos' : 'Add Another Photo'}
              </Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.photoHelp}>
            Tap to upload photos from your device. You can add up to 6 photos.
          </Text>
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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  photoPreviewContainer: {
    width: 100,
    height: 100,
    marginRight: 10,
    marginBottom: 10,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoBtn: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#ff6b6b',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  addPhotoText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
  photoHelp: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
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
