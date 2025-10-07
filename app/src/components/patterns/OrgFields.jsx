import FormField from '../FormField';
import '../../styles/csc-theme.css';

/**
 * Organization Field Patterns
 * Pre-configured FormField components for organization data
 * Maintains the exact visual hierarchy from the original design
 */

export const OrgName = ({ value, editable, onEdit }) => (
  <FormField
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="xl"
  />
);

export const OrgWebsite = ({ value, editable, onEdit }) => (
  <FormField
    label="Website"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
  />
);

export const OrgDescription = ({ value, editable, onEdit }) => (
  <FormField
    label="Description"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
    multiline
  />
);

export const OrgAddress = ({ street, city, province, postalCode, editable, onEdit }) => {
  const addressValue = [street, city, province, postalCode]
    .filter(Boolean)
    .join(', ');

  return (
    <FormField
      label="Address"
      value={addressValue}
      editable={editable}
      onEdit={onEdit}
      size="md"
      multiline
    />
  );
};

export const OrgInstitutionSize = ({ value, editable, onEdit }) => (
  <FormField
    label="Institution Size"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
  />
);

export const OrgPrimaryCategory = ({ value, editable, onEdit }) => (
  <FormField
    label="Primary Category"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
  />
);

export const OrgCatalogueUrl = ({ value, editable, onEdit }) => (
  <FormField
    label="Catalogue URL"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
  />
);

export const OrgCompanyDescription = ({ value, editable, onEdit }) => (
  <FormField
    label="Company Description"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
    multiline
  />
);

export const OrgHighlightProductName = ({ value, editable, onEdit }) => (
  <FormField
    label="Highlight Product Name"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
  />
);

export const OrgHighlightProductDescription = ({ value, editable, onEdit }) => (
  <FormField
    label="Highlight Product Description"
    value={value}
    editable={editable}
    onEdit={onEdit}
    size="md"
    multiline
  />
);
