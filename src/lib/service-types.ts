/** The standard types of service, in display order (the server's `svc_type_tbl` seed). Used by the dummy backend. */
export const STANDARD_SERVICE_TYPES = [
  'Electrician',
  'Wireman',
  'Lineman',
  'Plumber',
  'Pipefitter',
  'Carpenter',
  'Welder',
  'Fabricator',
  'Bricklayer',
  'Mason',
  'Roofer',
  'Scaffolder',
  'General Contractor',
  'Automotive Mechanic',
  'Diesel Mechanic',
  'Auto Electrician',
  'Truck Driver',
  'Delivery Driver',
  'Forklift Operator',
  'Heavy Equipment Operator',
  'Aircraft Maintenance Technician',
  'Assembly Line Worker',
  'Machinist',
  'Warehouse Worker',
  'Sorter',
  'Power Plant Operator',
  'Sandblaster',
  'Industrial Cleaner',
  'HVAC Technician',
  'Elevator Installer',
  'Solar Panel Installer',
  'Pest Control Technician',
  'Security Guard',
  'Cleaning Supervisor',
];

export const MAX_SERVICE_TYPE_LENGTH = 60;

/** Trims and collapses spaces, as the server stores it. */
export const cleanServiceType = (name: string) => name.trim().replace(/\s+/g, ' ');
