import React from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface ProjectSubnavProps {
  projectId: string;
}

const tabs = [
  { label: 'Overview', suffix: '' },
  { label: 'Comparison', suffix: '/comparison' },
  { label: 'Gaps', suffix: '/gaps' },
  { label: 'Hypotheses', suffix: '/hypotheses' },
] as const;

const ProjectSubnav: React.FC<ProjectSubnavProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = `/projects/${projectId}`;

  const isActive = (suffix: string) => {
    const path = `${base}${suffix}`;
    return suffix === '' ? location.pathname === base : location.pathname === path;
  };

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {tabs.map(({ label, suffix }) => (
        <Button
          key={label}
          size="small"
          variant={isActive(suffix) ? 'contained' : 'outlined'}
          onClick={() => navigate(`${base}${suffix}`)}
        >
          {label}
        </Button>
      ))}
      <Button
        size="small"
        variant="text"
        startIcon={<HelpOutlineIcon />}
        onClick={() => navigate('/guide#workflow')}
      >
        Guide
      </Button>
    </Stack>
  );
};

export default ProjectSubnav;
