import React from 'react';
import { Page, View, Text, Document, StyleSheet, Font } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { format } from 'date-fns';

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    fontSize: 9,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    marginBottom: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderTop: 1,
    borderLeft: 1,
    borderRight: 1,
    borderBottom: 1,
    borderColor: '#000',
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
    fontSize: 7,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeft: 1,
    borderRight: 1,
    borderBottom: 1,
    borderColor: '#000',
    minHeight: 18,
  },
  cell: {
    padding: 2,
    fontSize: 6,
    textAlign: 'center',
    borderRight: 1,
    borderColor: '#000',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 1,
  },
  cellText: {
    fontSize: 6,
    flexWrap: 'wrap',
    wordBreak: 'break-all',
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'black',
  },
});

// Column widths mapping (39 columns total)
const colWidths = [
  '4%',   // Code
  '11%',  // Name
  ...Array(31).fill('2.1%'), // 31 Days (65.1%)
  '3.3%', // P
  '3.3%', // L
  '3.3%', // A
  '3.3%', // OT
  '3.3%', // WO
  '3.3%', // G
];

// ─── Header ──────────────────────────────────────────────────────────────────
const Header = ({ currentMonth }) => (
  <View style={styles.header} fixed>
    <View style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={styles.title}>Monthly Attendance Report</Text>
      <Text style={{ fontSize: 10, marginTop: 4 }}>
        For the month of: {format(currentMonth, 'MMMM yyyy')}
      </Text>
    </View>
  </View>
);

// ─── Footer ──────────────────────────────────────────────────────────────────
const RenderFooter = () => (
  <View style={{ position: 'absolute', bottom: 15, left: 20, right: 20 }} fixed>
    <Text
      style={styles.pageNumber}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
    />
  </View>
);

// ─── Table Header ────────────────────────────────────────────────────────────
const AttendanceTableHeader = ({ daysArray }) => (
  <View style={styles.tableHeader} wrap={false}>
    {['Code', 'Name', ...daysArray, 'P', 'L', 'A', 'OT', 'WO', 'G'].map((label, i) => (
      <View
        key={label}
        style={{
          ...styles.cell,
          width: colWidths[i],
          borderRight: i === colWidths.length - 1 ? 0 : 1,
        }}
      >
        <Text style={{ textAlign: 'center', fontSize: 6, fontFamily: 'Helvetica-Bold' }}>
          {label}
        </Text>
      </View>
    ))}
  </View>
);

// ─── Table Row ───────────────────────────────────────────────────────────────
// eslint-disable-next-line 
const AttendanceTableRow = ({ item, daysArray }) => {
  return (
    <View style={styles.tableRow} wrap={false}>
      {/* Code */}
      <View style={{ ...styles.cell, width: colWidths[0] }}>
        <Text style={styles.cellText}>{item.empCode || '-'}</Text>
      </View>

      {/* Name */}
      <View style={{ ...styles.cell, width: colWidths[1], textAlign: 'left' }}>
        <Text style={styles.cellText}>{item.name || '-'}</Text>
      </View>

      {/* 31 Days */}
      {daysArray.map((day, i) => {
        const status = item[day] || '';
        let color = '#000';
        if (status.includes('A')) color = '#B71D18';
        else if (status.includes('WO') || status.includes('G')) color = '#00B8D9';
        else if (status.includes('L')) color = '#FFAB00';

        return (
          <View key={day} style={{ ...styles.cell, width: colWidths[2 + i] }}>
            <Text style={{ ...styles.cellText, color }}>{status}</Text>
          </View>
        );
      })}

      {/* Totals */}
      <View style={{ ...styles.cell, width: colWidths[33] }}>
        <Text style={styles.cellText}>{item.totalPresent}</Text>
      </View>
      <View style={{ ...styles.cell, width: colWidths[34] }}>
        <Text style={styles.cellText}>{item.totalLeave}</Text>
      </View>
      <View style={{ ...styles.cell, width: colWidths[35] }}>
        <Text style={{ ...styles.cellText, color: item.totalAbsent > 0 ? '#B71D18' : '#000' }}>
          {item.totalAbsent}
        </Text>
      </View>
      <View style={{ ...styles.cell, width: colWidths[36] }}>
        <Text style={styles.cellText}>{item.totalOvertime}</Text>
      </View>
      <View style={{ ...styles.cell, width: colWidths[37] }}>
        <Text style={styles.cellText}>{item.totalWeekOff}</Text>
      </View>
      <View style={{ ...styles.cell, width: colWidths[38], borderRight: 0 }}>
        <Text style={styles.cellText}>{item.totalGazzetted}</Text>
      </View>
    </View>
  );
};

// ─── Main PDF Document ───────────────────────────────────────────────────────
export default function AttendanceMonthWisePDF({ reportData, currentMonth }) {
  const data = reportData || [];
  const daysArray = Array.from({ length: 31 }, (_, i) => String(i + 1));

  return (
    <Document
      title={`Monthly Attendance - ${format(currentMonth, 'MMM yyyy')}`}
      author="HR Module"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Header currentMonth={currentMonth} />

        <AttendanceTableHeader daysArray={daysArray} />

        {data.map((item, index) => (
          <AttendanceTableRow key={item.empCode || index} item={item} daysArray={daysArray} />
        ))}

        {data.length === 0 && (
          <View style={[styles.tableRow, { justifyContent: 'center', padding: 10 }]}>
            <Text>No data available</Text>
          </View>
        )}

        <RenderFooter />
      </Page>
    </Document>
  );
}

// ─── PropTypes ───────────────────────────────────────────────────────────────
AttendanceMonthWisePDF.propTypes = {
  reportData: PropTypes.array,
  currentMonth: PropTypes.instanceOf(Date),
};

Header.propTypes = { currentMonth: PropTypes.instanceOf(Date) };
AttendanceTableHeader.propTypes = { daysArray: PropTypes.array };
AttendanceTableRow.propTypes = { item: PropTypes.object, daysArray: PropTypes.array };
