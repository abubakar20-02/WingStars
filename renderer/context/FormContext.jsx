// FormContext.jsx
import React, { createContext, useState, useEffect } from 'react';
// import fs from 'fs';
// import path from 'path';

// Create the FormContext
export const FormContext = createContext();



// Custom hook for persistent state without encryption
const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await window.ipc.store.get(key);
        if (savedState !== undefined && savedState !== null) {
          setState(savedState);
        }
      } catch (error) {
        console.error(`Error loading state for key "${key}":`, error);
      }
    };
    loadState();
  }, [key]);

  useEffect(() => {
    const saveState = async () => {
      try {
        await window.ipc.store.set(key, state);
      } catch (error) {
        console.error(`Error saving state for key "${key}":`, error);
      }
    };
    saveState();
  }, [key, state]);

  return [state, setState];
};

// Create the FormProvider component
export const FormProvider = ({ children }) => {
  // **Persisted States (Loaded from and Saved to IPC store)**
  const [formValues, setFormValues] = useState({
    trucks: '',
    staff: '',
    typeI: '',
    typeIV: '',
  });
  const [predefinedComments, setPredefinedComments] = useState(null);
  const [apiEndpoint, setApiEndpoint] = useState(null);
  const [scraper, setScraper] = useState(null);
  const [comments, setComments] = useState([]);
  const [customComment, setCustomComment] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredComments, setFilteredComments] = useState(predefinedComments);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastEmailSentTime, setLastEmailSentTime] = useState('');

  // **Transient States (Managed in Memory Only)**
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // **Settings (Transient Only)**
  const [email, setEmail] = usePersistentState('email', '');
  const [password, setPassword] = usePersistentState('password', ''); // Now using usePersistentState
  const [apiDelay, setApiDelay] = usePersistentState('delay', 10);
  const [receiveEmail, setReceiveEmail] = usePersistentState('receiveEmail', '');

  // **Snackbar State**
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: '' });

  // Fetch API Endpoint from Electron main process
  useEffect(() => {
    const loadApiEndpoint = async () => {
      try {
        const endpoint = await window.ipc.apiEndpoint.get(); // Fetch from Electron store
        setApiEndpoint(endpoint);
        console.log(`Loaded API Endpoint: ${endpoint}`);
      } catch (error) {
        console.error('Error fetching API Endpoint:', error.message);
      }
    };

    loadApiEndpoint();
  }, []);
  


  // **Load Persisted States on Mount**
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedPreDefinedComment = await window.ipc.store.get('predefinedComments');
        const savedScraper = await window.ipc.store.get('scraper');
        const savedEndPoint = await window.ipc.store.get('apiEndpoint');
        const savedFormValues = await window.ipc.store.get('formValues');
        const savedComments = await window.ipc.store.get('comments');
        const savedCustomComment = await window.ipc.store.get('customComment');
        const savedShowDropdown = await window.ipc.store.get('showDropdown');
        const savedFilteredComments = await window.ipc.store.get('filteredComments');
        const savedImagePreview = await window.ipc.store.get('imagePreview');
        const savedImageDimensions = await window.ipc.store.get('imageDimensions');
        const savedIsModalOpen = await window.ipc.store.get('isModalOpen');
        const savedLastEmailSentTime = await window.ipc.store.get('lastEmailSentTime');
        const savedEmail = await window.ipc.store.get('email');
        const savedReceiveEmail = await window.ipc.store.get('receiveEmail');
        const savedDelay = await window.ipc.store.get('delay');
        const savedPassword = await window.ipc.store.get('password'); // Load password

        if (savedPreDefinedComment) setPredefinedComments(savedPreDefinedComment);
        if (savedScraper) setScraper(savedScraper);
        if (savedEndPoint) setApiEndpoint(savedEndPoint);
        if (savedFormValues) setFormValues(savedFormValues);
        if (savedComments) setComments(savedComments);
        if (savedCustomComment) setCustomComment(savedCustomComment);
        if (savedShowDropdown !== undefined) setShowDropdown(savedShowDropdown);
        if (savedFilteredComments) setFilteredComments(savedFilteredComments);
        if (savedImagePreview) setImagePreview(savedImagePreview);
        if (savedImageDimensions) setImageDimensions(savedImageDimensions);
        if (savedIsModalOpen !== undefined) setIsModalOpen(savedIsModalOpen);
        if (savedLastEmailSentTime) setLastEmailSentTime(savedLastEmailSentTime);
        if (savedEmail) setEmail(savedEmail);
        if (savedReceiveEmail) setReceiveEmail(savedReceiveEmail);
        if (savedDelay) setApiDelay(Number(savedDelay));
        if (savedPassword) setPassword(savedPassword); // Set password
      } catch (error) {
        console.error('Error loading form state:', error);
        setSnackbar({ open: true, message: 'Failed to load form state.', type: 'error' });
      }
    };

    loadState();
  }, []);

  // **Save Persisted States to IPC store whenever they change**
  useEffect(() => {
    const saveState = async () => {
      try {
        await window.ipc.store.set('formValues', formValues);
        await window.ipc.store.set('comments', comments);
        await window.ipc.store.set('customComment', customComment);
        await window.ipc.store.set('showDropdown', showDropdown);
        await window.ipc.store.set('filteredComments', filteredComments);
        await window.ipc.store.set('imagePreview', imagePreview);
        await window.ipc.store.set('imageDimensions', imageDimensions);
        await window.ipc.store.set('isModalOpen', isModalOpen);
        await window.ipc.store.set('lastEmailSentTime', lastEmailSentTime);
        await window.ipc.store.set('email', email);
        await window.ipc.store.set('password', password); // Save as plain text
        await window.ipc.store.set('receiveEmail', receiveEmail);
        await window.ipc.store.set('delay', apiDelay);
      } catch (error) {
        console.error('Error saving form state:', error);
        setSnackbar({ open: true, message: 'Failed to save form state.', type: 'error' });
      }
    };

    saveState();
  }, [
    formValues,
    comments,
    customComment,
    showDropdown,
    filteredComments,
    imagePreview,
    imageDimensions,
    isModalOpen,
    lastEmailSentTime,
    email,
    password,
    receiveEmail,
    apiDelay, // Include delay in dependencies
  ]);

  return (
    <FormContext.Provider
      value={{
        scraper,
        apiEndpoint,
        formValues,
        setFormValues,
        comments,
        setComments,
        customComment,
        setCustomComment,
        showDropdown,
        setShowDropdown,
        filteredComments,
        setFilteredComments,
        imagePreview,
        setImagePreview,
        imageDimensions,
        setImageDimensions,
        isModalOpen,
        setIsModalOpen,
        lastEmailSentTime,
        setLastEmailSentTime,
        // **Include Settings in the Context Value**
        email,
        setEmail,
        password,
        setPassword,
        receiveEmail,
        setReceiveEmail,
        apiDelay, // Now correctly named
        setApiDelay,
        snackbar,
        setSnackbar,
        // Predefined comments
        predefinedComments,
        // Transient States
        isSubmitting,
        setIsSubmitting,
        isSendingEmail,
        setIsSendingEmail,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};
