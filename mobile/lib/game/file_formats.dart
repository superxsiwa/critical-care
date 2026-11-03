/// The names and layout versions of the files the app reads and writes. A file names itself in its
/// `format` key, so a reader can tell a case package from a backup picked by mistake.
library;

/// A case package from the Case Studio (`contract/README.md`).
const casePackageFormat = 'critical-care-cases';

/// The newest case package layout this app reads; every older one stays readable.
const casePackageVersion = 1;

/// The player's backup file (#19).
const backupFormat = 'critical-care-backup';

/// The backup layout this app writes. A later layout gets a higher number; this app reads every
/// version up to its own and refuses newer ones.
const backupVersion = 1;
