export interface IdentifyContactDetailsResponse {
    primaryContatctId: number| null;
    emails: Array<string>;
    phoneNumbers: Array<string>;
    secondaryContactIds: Array<number>;
}