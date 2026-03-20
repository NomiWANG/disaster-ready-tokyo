import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import EmergencyContactsService from '../services/EmergencyContactsService';

const EmergencyContactsContext = createContext(null);

export const EmergencyContactsProvider = ({ children }) => {
  const [contacts, setContacts] = useState([]);

  const refresh = useCallback(async () => {
    const list = await EmergencyContactsService.getContacts();
    setContacts(list);
  }, []);

  const addContact = useCallback(
    async (contact) => {
      await EmergencyContactsService.addContact(contact);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    contacts,
    refresh,
    addContact,
  };

  return (
    <EmergencyContactsContext.Provider value={value}>
      {children}
    </EmergencyContactsContext.Provider>
  );
};

export const useEmergencyContacts = () => useContext(EmergencyContactsContext);


