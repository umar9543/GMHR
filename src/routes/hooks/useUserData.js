import { useMemo } from 'react';
import { decrypt } from 'src/api/encryption';

const useUserData = () => {
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  
  return userData ? userData.map(user => ({
    ...user,
    roleID: decrypt(user.roleID),
  })) : null;
};

export default useUserData;
