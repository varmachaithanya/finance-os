import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  TextField,
  InputAdornment,
  Skeleton,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';

export interface Column<T> {
  id: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  loading?: boolean;
  emptyMessage?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

const cellSx = {
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden' as const,
  textOverflow: 'ellipsis' as const,
  maxWidth: 200,
};

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  page,
  limit,
  onPageChange,
  onSortChange,
  loading = false,
  emptyMessage = 'No data available',
  searchValue = '',
  onSearchChange,
}: DataTableProps<T>) {
  const [sortField, setSortField] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    const isAsc = sortField === field && sortDir === 'asc';
    const dir = isAsc ? 'desc' : 'asc';
    setSortField(field);
    setSortDir(dir);
    onSortChange?.(field, dir);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const skeletonRows = Array.from({ length: limit }, (_, i) => i);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {onSearchChange && (
        <Box sx={{ p: 2, pb: 0 }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 300 }}
          />
        </Box>
      )}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id} sx={cellSx}>
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortField === col.id}
                      direction={sortField === col.id ? sortDir : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              skeletonRows.map((i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <InboxIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={(row.id as string) ?? idx} hover>
                  {columns.map((col) => (
                    <TableCell key={col.id} sx={cellSx}>
                      {col.render ? col.render(row) : (row[col.id] as React.ReactNode) ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={limit}
        rowsPerPageOptions={[limit]}
      />
    </Paper>
  );
}

export default DataTable;
