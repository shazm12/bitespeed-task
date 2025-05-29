import { Request, Response } from 'express';
import { query } from '../helpers/db';
import { ContactDetails } from '../interfaces/ContactDetails';
import {IdentifyContactDetailsResponse} from "../interfaces/IdentifyContactDetailsResponse";


/**
 * Creates a new contact detail record in the database
 */
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

/**
 * Checks if there's only one primary contact in the linked contacts list
 */
const hasSinglePrimaryContact = (linkedContacts: ContactDetails[]): boolean => {
  return linkedContacts.filter(c => c.linkPrecedence === "primary").length === 1;
};


export const identifyContactDetails = async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "At least one of email or phoneNumber must be provided" });
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


    if ((!isEmailPresent || !isPhonePresent) && (email || phoneNumber)) {
      const newContact = await createContactDetail(
        email || null, 
        phoneNumber || null, 
        primaryContactId, 
        linkPrecedence
      );


      updateResponseData(newContact, emails, phoneNumbers, secondaryContactIds);

      return res.status(200).json({
        contact: buildResponse(primaryContactId, emails, phoneNumbers, secondaryContactIds)
      });
    }

    if (!hasSinglePrimaryContact(linkedContacts) && linkedContacts.length > 1) {
      await handleMultiplePrimaryContacts(linkedContacts, secondaryContactIds);
      primaryContactId = linkedContacts[0].id;
    }

    return res.status(200).json({
      contact: buildResponse(primaryContactId, emails, phoneNumbers, secondaryContactIds)
    });

  } catch (error) {
    console.error("Error in identifyContactDetails:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


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
