import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from 'src/routes/paths';

export default function RoleGuard({ allowedRoles, allowedSectionIDs, children }) {
  const navigate = useNavigate();

  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('UserData'));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const userRoles =userData?.roleId ? [userData.roleId] : [];
    const userSectionID = userData?.userDetails?.SectionID;

    let hasAccess = true;

    // Check roles if provided
    if (allowedRoles && allowedRoles.length > 0) {
      hasAccess = allowedRoles.some((role) => userRoles.includes(role));
    }

    // Check SectionID if provided (both role and SectionID must pass)
    if (hasAccess && allowedSectionIDs && allowedSectionIDs.length > 0) {
      hasAccess = allowedSectionIDs.includes(userSectionID);
    }

    if (!hasAccess) {
      navigate(paths.page403);
    }
  }, [userData, navigate, allowedRoles, allowedSectionIDs]);

  return children;
}
