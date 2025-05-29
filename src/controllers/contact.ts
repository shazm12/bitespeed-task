import { Request, RequestHandler, Response } from 'express';
import { query } from '../helpers/db';
import { ContactDetails } from '../interfaces/ContactDetails';
import {IdentifyContactDetailsResponse} from "../interfaces/IdentifyContactDetailsResponse";


const createContactDetail = async (
  email: string | null, 
  phoneNumber: string | null, 
  linkedId: number | null, 
  linkPrecedence: 'primary' | 'secondary'
): Promise<ContactDetails> => {
  try {
    const result = await query(
      `INSERT INTO contact_details(email, phone_number, linked_id, link_precedence) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, phone_number as "phoneNumber", linked_id as "linkedId", 
                 link_precedence as "linkPrecedence", created_at as "createdAt", 
                 updated_at as "updatedAt"`,
      [email, phoneNumber, linkedId, linkPrecedence]
    );
    
    if (!result.rows[0]) {
      throw new Error('No data returned from insert operation');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error("Error creating contact detail:", error);
    throw new Error('Failed to create contact detail');
  }
};


const hasSinglePrimaryContact = (linkedContacts: ContactDetails[]): boolean => {
  return linkedContacts.filter(c => c.linkPrecedence === "primary").length === 1;
};


export const identifyContactDetails: RequestHandler  = async(req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    res.status(400).json({ error: "At least one of email or phoneNumber must be provided" });
    return;
  }

  try {
    const allContacts = await getAllContactDetails();
    let primaryContactId: number | null = null;
    let linkPrecedence: 'primary' | 'secondary' = "primary";
    

    const { linkedContacts, isEmailPresent, isPhonePresent } = findMatchingContacts(
      allContacts, 
      email, 
      phoneNumber
    );

    linkedContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());


    if (linkedContacts.length > 0) {
      const primaryContact = linkedContacts.find(c => c.linkPrecedence === "primary");
      primaryContactId = primaryContact ? primaryContact.id : null;
      linkPrecedence = primaryContactId ? "secondary" : "primary";
    }


    const { emails, phoneNumbers, secondaryContactIds } = prepareResponseData(linkedContacts);

    // If the contact data is a new contact data
    if ((!isEmailPresent || !isPhonePresent) && (email || phoneNumber)) {
      const newContact = await createContactDetail(
        email || null, 
        phoneNumber || null, 
        primaryContactId, 
        linkPrecedence
      );


      updateResponseData(newContact, emails, phoneNumbers, secondaryContactIds);

      res.status(200).json({
        contact: buildResponse(primaryContactId, emails, phoneNumbers, secondaryContactIds)
      });
      return;
    }

    if (!hasSinglePrimaryContact(linkedContacts) && linkedContacts.length > 1) {
        primaryContactId = linkedContacts[0].id;
        await handleMultiplePrimaryContacts(linkedContacts, primaryContactId, secondaryContactIds);
    }

    res.status(200).json({
      contact: buildResponse(primaryContactId, emails, phoneNumbers, secondaryContactIds)
    });
    return;

  } catch (error) {
    console.error("Error in identifyContactDetails:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
}


const findMatchingContacts = (
  allContacts: ContactDetails[], 
  email?: string, 
  phoneNumber?: string
) => {
  const linkedContacts: ContactDetails[] = [];
  let isEmailPresent = false;
  let isPhonePresent = false;

  allContacts.forEach(contact => {
    const emailMatch = email && email === contact.email;
    const phoneMatch = phoneNumber && phoneNumber === contact.phoneNumber;

    if (emailMatch || phoneMatch) {
      if (emailMatch) isEmailPresent = true;
      if (phoneMatch) isPhonePresent = true;
      linkedContacts.push(contact);
    }
  });

  return { linkedContacts, isEmailPresent, isPhonePresent };
};


const prepareResponseData = (linkedContacts: ContactDetails[]) => {
  const emails = new Set<string>();
  const phoneNumbers = new Set<string>();
  const secondaryContactIds = new Set<number>();

  linkedContacts.forEach(contact => {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    if (contact.linkPrecedence === "secondary" && contact.id) {
      secondaryContactIds.add(contact.id);
    }
  });

  return { emails, phoneNumbers, secondaryContactIds };
};


const updateResponseData = (
  newContact: ContactDetails,
  emails: Set<string>,
  phoneNumbers: Set<string>,
  secondaryContactIds: Set<number>
) => {
  if (newContact.email) emails.add(newContact.email);
  if (newContact.phoneNumber) phoneNumbers.add(newContact.phoneNumber);
  if (newContact.linkPrecedence === "secondary" && newContact.id) {
    secondaryContactIds.add(newContact.id);
  }
};


const buildResponse = (
  primaryContactId: number | null,
  emails: Set<string>,
  phoneNumbers: Set<string>,
  secondaryContactIds: Set<number>
): IdentifyContactDetailsResponse => {
  return {
    primaryContatctId: primaryContactId,
    emails: Array.from(emails),
    phoneNumbers: Array.from(phoneNumbers),
    secondaryContactIds: Array.from(secondaryContactIds),
  };
};


const handleMultiplePrimaryContacts = async (
  linkedContacts: ContactDetails[],
  primaryContactId: number,
  secondaryContactIds: Set<number>
) => {
  const contactsToConvert = linkedContacts
    .slice(1) // Keep the first contact as primary
    .filter(contact => contact.linkPrecedence === "primary");

  await Promise.all(
    contactsToConvert.map(contact => {
      convertToSecondaryContact(primaryContactId, contact)
    }));

  contactsToConvert.forEach(contact => {
    if (contact.id) secondaryContactIds.add(contact.id);
  });
};


const convertToSecondaryContact = async (
  primaryContactId: number,
  contact: ContactDetails
): Promise<void> => {
  try {
    await query(
      `UPDATE contact_details
       SET link_precedence = 'secondary', linked_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [primaryContactId, contact.id]
    );
  }
catch(error) {
    console.error("Error Occured: ", error);
    throw new Error("Error Occured while performing db operation");
  } 
};


const getAllContactDetails = async (): Promise<ContactDetails[]> => {
  try {
    const result = await query(
      `SELECT id, email, phone_number as "phoneNumber", linked_id as "linkedId",
              link_precedence as "linkPrecedence", created_at as "createdAt",
              updated_at as "updatedAt"
       FROM contact_details`
    );
    return result.rows;
  }
  catch(error) {
    console.error("Error Occured: ", error);
    throw new Error("Error Occured while getting all contacts");
  }
};
