import { useCallback, useMemo } from 'react';
import { Get } from 'src/api/apibasemethods';

const useGetAllClausesByDocTypeID = () => {
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const getAllClauses = useCallback(
    async (docTypeId) => {
      try {
        const response = await Get(
          `getAllClausesbyDocTypeID?Document_TypeID=${docTypeId}&OrgID=${userData?.userDetails?.orgId}&BranchID=${userData?.userDetails?.branchID}`
        );

        return (response?.data || []).map((item) => ({
          id: item.Clause_ID,
          clause: item.Clause,
          paymentTermID: item.Payment_term_ID,
          paymentTerm: item.Payment_Term,
          ClausesCatID: item.ClausesCatID,
          ClausesCategory: item.ClausesCategory,
          docName: item.Doc_Name,
          isActive: item.isActive,
        }));
      } catch (error) {
        console.error('Error fetching clauses:', error);
        return [];
      }
    },
    [userData?.userDetails?.orgId, userData?.userDetails?.branchID]
  );

  return getAllClauses;
};

export default useGetAllClausesByDocTypeID;
