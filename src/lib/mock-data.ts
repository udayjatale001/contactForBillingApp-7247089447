export type Bill = {
  id: string;
  customerName: string;
  totalCarat: number;
  caratType: 'Small Carat' | 'Big Carat';
  rate: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paidTo: string;
  paymentMode: 'PhonePe' | 'Cash';
  createdAt: Date;
};

export const mockBills: Bill[] = [
  {
    id: '1',
    customerName: 'Ramesh Patel',
    totalCarat: 150,
    caratType: 'Small Carat',
    rate: 17,
    totalAmount: 2550,
    paidAmount: 2000,
    dueAmount: 550,
    paidTo: 'Gopal Dada',
    paymentMode: 'Cash',
    createdAt: new Date('2024-07-21T10:30:00'),
  },
  {
    id: '2',
    customerName: 'Suresh Singh',
    totalCarat: 100,
    caratType: 'Big Carat',
    rate: 20,
    totalAmount: 2000,
    paidAmount: 2000,
    dueAmount: 0,
    paidTo: 'Yuvraj Dada',
    paymentMode: 'PhonePe',
    createdAt: new Date('2024-07-21T11:45:00'),
  },
  {
    id: '3',
    customerName: 'Priya Sharma',
    totalCarat: 220,
    caratType: 'Small Carat',
    rate: 17,
    totalAmount: 3740,
    paidAmount: 3000,
    dueAmount: 740,
    paidTo: 'Suyash Dada',
    paymentMode: 'Cash',
    createdAt: new Date('2024-07-20T14:00:00'),
  },
  {
    id: '4',
    customerName: 'Amit Kumar',
    totalCarat: 80,
    caratType: 'Big Carat',
    rate: 20,
    totalAmount: 1600,
    paidAmount: 1600,
    dueAmount: 0,
    paidTo: 'Gaju Dada',
    paymentMode: 'PhonePe',
    createdAt: new Date('2024-07-20T16:20:00'),
  },
  {
    id: '5',
    customerName: 'Sunita Devi',
    totalCarat: 300,
    caratType: 'Small Carat',
    rate: 17,
    totalAmount: 5100,
    paidAmount: 4000,
    dueAmount: 1100,
    paidTo: 'Gopal Dada',
    paymentMode: 'Cash',
    createdAt: new Date('2024-06-15T09:10:00'),
  },
  {
    id: '6',
    customerName: 'Vikas Mehra',
    totalCarat: 50,
    caratType: 'Big Carat',
    rate: 20,
    totalAmount: 1000,
    paidAmount: 0,
    dueAmount: 1000,
    paidTo: 'Yuvraj Dada',
    paymentMode: 'Cash',
    createdAt: new Date('2024-06-12T18:00:00'),
  },
];
