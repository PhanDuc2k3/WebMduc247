function setting(name,fallback,min,max){const value=Number(process.env[name]||fallback);if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(`${name} must be an integer from ${min} to ${max}`);return value;}
export const USER_ADMIN_POLICY=Object.freeze({
  temporaryMaxDays:setting('USER_TEMP_SUSPENSION_MAX_DAYS',366,1,3650),
  signalWindowDays:setting('USER_SIGNAL_WINDOW_DAYS',30,1,365),
  artifactHours:setting('USER_PRIVACY_ARTIFACT_HOURS',168,1,8760),
});
