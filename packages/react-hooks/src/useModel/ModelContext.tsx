import React from 'react';
import ModelDispatcher from './ModelDispatcher';

export const ModelContext = React.createContext<{ dispatcher: ModelDispatcher }>({
  dispatcher: new ModelDispatcher(),
});
