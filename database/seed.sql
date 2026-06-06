INSERT INTO officers (badge_number, full_name, rank_title, role, permissions, email, phone, assigned_unit)
VALUES
  ('4521', 'Officer Mutoni', 'Inspector', 'admin', JSON_ARRAY('cases:*', 'evidence:*', 'officers:*', 'suspects:*', 'analytics:view', 'identity:verify'), 'mutoni@sentinel.local', '+250780000001', 'Central Operations'),
  ('4187', 'Officer Jean Claude', 'Detective Sergeant', 'investigator', JSON_ARRAY('cases:read', 'cases:write', 'evidence:read', 'evidence:write', 'suspects:read', 'identity:request'), 'jean.claude@sentinel.local', '+250780000002', 'Investigations Unit'),
  ('5304', 'Officer Aline', 'Analyst', 'analyst', JSON_ARRAY('cases:read', 'analytics:view', 'suspects:read'), 'aline@sentinel.local', '+250780000003', 'Intelligence Desk');
