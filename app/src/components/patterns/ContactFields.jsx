import FormField from '../FormField';
import '../../styles/csc-theme.css';

/**
 * Contact Field Patterns
 * Pre-configured FormField components for contact/user data
 */

export const ContactName = ({ value, editable, onEdit }) => (
  <FormField
    label="Name"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="lg"
  />
);

export const ContactEmail = ({ value, editable, onEdit }) => (
  <FormField
    label="Email"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
  />
);

export const ContactPhone = ({ value, editable, onEdit }) => (
  <FormField
    label="Phone"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
  />
);

export const ContactTitle = ({ value, editable, onEdit }) => (
  <FormField
    label="Role/Title"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
  />
);
