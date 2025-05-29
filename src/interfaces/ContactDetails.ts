export interface ContactDetails {
    id: number;
    linkedId: number | null; 
    linkPrecedence: 'primary' | 'secondary';  
    email: string | null; 
    phoneNumber: string | null; 
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null; 
}
