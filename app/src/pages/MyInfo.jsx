import { useState } from 'react';
import { Page, Section, FieldGroup } from '../components/layouts';
import { ContactFields } from '../components/patterns';
import { Modal, Input, Button } from '../components';
import '../styles/design-system.css';
import '../styles/csc-theme.css';

/**
 * My Info Page
 *
 * User's personal contact information
 * Always editable by the logged-in user
 */
export default function MyInfo() {
  // Mock data - will be replaced with real session data
  const [userData, setUserData] = useState({
    name: 'Stephen Thomas',
    email: 'google@campusstores.ca',
    phone: '(403) 541-0911',
    title: 'Community Manager & Developer Relations'
  });

  // Edit modal state
  const [editModal, setEditModal] = useState({
    isOpen: false,
    field: null,
    value: ''
  });

  const openEditModal = (field, currentValue) => {
    setEditModal({
      isOpen: true,
      field,
      value: currentValue
    });
  };

  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      field: null,
      value: ''
    });
  };

  const saveEdit = () => {
    setUserData({
      ...userData,
      [editModal.field]: editModal.value
    });
    closeEditModal();
  };

  const getFieldLabel = (field) => {
    const labels = {
      name: 'Name',
      email: 'Email Address',
      phone: 'Phone Number',
      title: 'Role/Title'
    };
    return labels[field];
  };

  const getFieldType = (field) => {
    const types = {
      email: 'email',
      phone: 'tel'
    };
    return types[field] || 'text';
  };

  return (
    <Page>
      <Section
        title="Your Contact Information"
        description="This information is always editable by you."
      >
        <FieldGroup>
          <ContactFields.ContactName
            value={userData.name}
            editable
            onEdit={() => openEditModal('name', userData.name)}
          />
          <ContactFields.ContactEmail
            value={userData.email}
            editable
            onEdit={() => openEditModal('email', userData.email)}
          />
          <ContactFields.ContactPhone
            value={userData.phone}
            editable
            onEdit={() => openEditModal('phone', userData.phone)}
          />
          <ContactFields.ContactTitle
            value={userData.title}
            editable
            onEdit={() => openEditModal('title', userData.title)}
          />
        </FieldGroup>
      </Section>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={closeEditModal}
        title={`Edit ${getFieldLabel(editModal.field)}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <Input
            label={getFieldLabel(editModal.field)}
            type={getFieldType(editModal.field)}
            value={editModal.value}
            onChange={(value) => setEditModal({ ...editModal, value })}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
