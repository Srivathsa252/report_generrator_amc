import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Receipt } from '../types';

interface ReceiptsState {
  data: Receipt[];
}

const initialState: ReceiptsState = {
  data: [],
};

const receiptsSlice = createSlice({
  name: 'receipts',
  initialState,
  reducers: {
    setReceipts(state, action: PayloadAction<Receipt[]>) {
      state.data = action.payload;
    },
    addReceipt(state, action: PayloadAction<Receipt>) {
      state.data.push(action.payload);
    },
  },
});

export const { setReceipts, addReceipt } = receiptsSlice.actions;
export default receiptsSlice.reducer; 