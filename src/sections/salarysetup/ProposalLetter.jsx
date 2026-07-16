import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    PDFViewer,
    Font,
} from '@react-pdf/renderer';
import { fDate } from 'src/utils/format-time';
import PropTypes from 'prop-types';


const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 12,
        lineHeight: 1.5,
        fontFamily: 'Helvetica',
    },
    date: {
        marginBottom: 40,
    },
    address: {
        marginBottom: 30,
        lineHeight: 1.4,
    },
    addressLine: {
        marginBottom: 3,
    },
    subject: {
        marginBottom: 20,
        fontFamily: 'Roboto-Bold'
    },
    body: {
        marginBottom: 12,
        lineHeight: 1.6,
        textAlign: 'justify',
    },
    salutation: {
        marginBottom: 15,
    },
    table: {
        display: 'table',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginVertical: 20,
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableColHeader: {
        width: '16.66%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: '#f5f5f5',
        padding: 8,
        fontFamily: 'Roboto-Bold',
        fontSize: 10,
        textAlign: 'center',
    },
    tableCol: {
        width: '16.66%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 8,
        fontSize: 10,
        textAlign: 'center',
    },
    boldText: {
        fontFamily: 'Roboto-Bold'
    },
    closing: {
        marginTop: 30,
    },
    signature: {
        marginTop: 40,
    },
});

export default function ProposalLetter({ currentData }) {
    console.log(currentData, 'daata')
   function ToUTCISOString(date) {
    if (!date) return null;

    const dateObj = new Date(date);

    // Format as YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${day}-${month}-${year}`; // e.g., "2023-05-10"
  }
    const ProposalDocument = () => (
        <Document>
            <Page size="A3" style={styles.page}>
                {/* Date */}
                <Text style={styles.date}>Date : <Text>{fDate(currentData.Submission_Date)}</Text></Text>

                {/* Address */}
                <View style={styles.address}>
                    <Text style={styles.addressLine}>The Manager</Text>
                    <Text style={styles.addressLine}>{currentData.BankName}</Text>
                    <Text style={styles.addressLine}>Tejgaon Branch</Text>
                    <Text style={styles.addressLine}>Rahmans Regnum Centre (1st Floor)</Text>
                    <Text style={styles.addressLine}>191/B, Tejgaon-Gulshan Link Road</Text>
                    <Text style={styles.addressLine}/>
                    <Text style={styles.addressLine}>Tejgaon I/A,</Text>
                    <Text style={styles.addressLine}>Dhaka-1208.</Text>
                </View>

                {/* Subject */}
                <Text style={styles.subject}>Subject: Proposal for document negotiation</Text>

                {/* Salutation */}
                <Text style={styles.salutation}>Dear Sir,</Text>

                {/* Body Content */}
                <Text style={styles.body}>
                    In Connection with the above mentioned subject, we would like to inform you that, we have received acceptance against the following LCs:
                </Text>

                {/* Table */}
                {/* Table */}
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableColHeader, { width: '20%' }]}>LCNo</Text>
                        <Text style={[styles.tableColHeader, { width: '15%' }]}>LCDate</Text>
                        <Text style={[styles.tableColHeader, { width: '15%' }]}>LC Amt. (USD)</Text>
                        <Text style={[styles.tableColHeader, { width: '20%' }]}>Bank Ref No</Text>
                        <Text style={[styles.tableColHeader, { width: '15%' }]}>Maturity Date</Text>
                        <Text style={[styles.tableColHeader, { width: '15%' }]}>Doc Value (USD)</Text>
                    </View>

                    {/* Table Data Rows */}
                    {currentData?.selectedRows?.map((item, index) => (
                        <View style={styles.tableRow} key={index}>
                            <Text style={[styles.tableCol, { width: '20%' }]}>{item.ExportLCNo || item.LCNo || 'N/A'}</Text>
                            <Text style={[styles.tableCol, { width: '15%' }]}>
                                {
                                // eslint-disable-next-line
                                item.ExportInvoiceDate ? ToUTCISOString(item.ExportInvoiceDate) :
                                    item.LCDate ? ToUTCISOString(new Date(item.LCDate)) : 'N/A'}
                            </Text>
                            <Text style={[styles.tableCol, { width: '15%' }]}>
                                {item.LCAmtUSD ||0}
                            </Text>
                            <Text style={[styles.tableCol, { width: '20%' }]}>{item.BankRefNo || 'N/A'}</Text>
                            <Text style={[styles.tableCol, { width: '15%' }]}>
                                {item.MaturityDate ? ToUTCISOString(new Date(item.MaturityDate)) : 'N/A'}
                            </Text>
                            <Text style={[styles.tableCol, { width: '15%' }]}>
                                {item.DocValueUSD || 0}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Continued Body Content */}
                <Text style={styles.body}>
                    We would like to request you to negotiate 80% of the above mentioned LCs for <Text style={styles.boldText}>Salary Payment/Overhead</Text>. So, please transfer the local currency to our A/c Title: <Text style={styles.boldText}>SIMCO Spinning & Textiles Ltd. A/c no. 1041101000000779</Text>.
                </Text>

                <Text style={styles.body}>
                    If the bill will be un-realized by issuing bank, we will adjust the loan amount with up to date interest from own source.
                </Text>

                <Text style={styles.body}>
                    Your Kind co-operation in this regard will be highly appreciated.
                </Text>

                {/* Closing */}
                <View style={styles.closing}>
                    <Text style={styles.body}>Thanking You</Text>
                    <Text style={styles.body}/>
                    <Text style={styles.body}>Sincerely</Text>
                </View>

                {/* Signature Space */}
                <View style={styles.signature}>
                    <Text>.................................</Text>
                </View>
            </Page>
        </Document>
    );

    return (
        <PDFViewer style={{ height: '100vh', width: '100%' }}>
            <ProposalDocument />
        </PDFViewer>
    );

}
ProposalLetter.propTypes = {
  currentData: PropTypes.object,
};
// Font registrations
Font.register({ family: 'Roboto-Bold', src: '/fonts/Roboto-Bold.ttf' });
Font.register({ family: 'Roboto-Regular', src: '/fonts/Roboto-Regular.ttf' });