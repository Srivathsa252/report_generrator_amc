import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Target } from '../types';

interface TargetsState {
  data: Target[];
}

const initialState: TargetsState = {
  data: [],
};

const targetsSlice = createSlice({
  name: 'targets',
  initialState,
  reducers: {
    setTargets(state, action: PayloadAction<Target[]>) {
      state.data = action.payload;
    },
    addTarget(state, action: PayloadAction<Target>) {
      state.data.push(action.payload);
    },
  },
});

export const { setTargets, addTarget } = targetsSlice.actions;
export default targetsSlice.reducer; 