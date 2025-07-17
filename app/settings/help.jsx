import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';
import { Mail, Phone, MessageCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react-native';

export default function HelpScreen() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const contactMethods = [
    {
      icon: <Mail size={20} color={colors.text} />,
      title: 'Email Support',
      description: 'Get help via email',
      action: 'support@roadwatch.com',
      onPress: () => Linking.openURL('mailto:support@roadwatch.com'),
    },
    {
      icon: <Phone size={20} color={colors.text} />,
      title: 'Phone Support',
      description: 'Speak with our team',
      action: '1-800-ROAD-HELP',
      onPress: () => Linking.openURL('tel:1-800-7623-4357'),
    },
    {
      icon: <MessageCircle size={20} color={colors.text} />,
      title: 'Live Chat',
      description: 'Chat with support team',
      action: 'Available 24/7',
      onPress: () => {/* Handle live chat */},
    },
  ];

  const faqs = [
    {
      question: 'How do I report an incident?',
      answer: 'To report an incident, tap the "+" button in the center of the bottom navigation bar. Fill in the required details about the incident, add any photos if available, and submit the report.',
    },
    {
      question: 'Can I report anonymously?',
      answer: 'Yes, you can enable anonymous reporting in your Privacy Settings. When enabled, your personal information will not be visible to other users when you report incidents.',
    },
    {
      question: 'How do I update my profile?',
      answer: 'Go to the Profile tab and tap "Edit Profile" under your profile picture. You can update your name, email, and profile picture from there.',
    },
    {
      question: 'What types of incidents can I report?',
      answer: 'You can report various types of road incidents including accidents, road hazards, construction work, traffic jams, and emergency situations.',
    },
    {
      question: 'How are incident reports verified?',
      answer: 'Reports are verified through community validation and our moderation team. Multiple reports of the same incident increase its verification status.',
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen 
        options={{
          title: 'Help & Support',
          headerShadowVisible: false,
        }}
      />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.sectionDescription}>
          Get in touch with our support team
        </Text>
      </View>

      <View style={styles.contactList}>
        {contactMethods.map((method, index) => (
          <TouchableOpacity
            key={index}
            style={styles.contactItem}
            onPress={method.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.contactIcon}>
              {method.icon}
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>{method.title}</Text>
              <Text style={styles.contactDescription}>
                {method.description}
              </Text>
            </View>
            <Text style={styles.contactAction}>{method.action}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, styles.faqSection]}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <Text style={styles.sectionDescription}>
          Find quick answers to common questions
        </Text>
      </View>

      <View style={styles.faqList}>
        {faqs.map((faq, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.faqItem,
              expandedFaq === index && styles.faqItemExpanded
            ]}
            onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <View style={[
                styles.faqIcon,
                expandedFaq === index && styles.faqIconActive
              ]}>
                <HelpCircle size={20} color={expandedFaq === index ? colors.primary : colors.text} />
              </View>
              <Text style={[
                styles.faqQuestion,
                expandedFaq === index && styles.faqQuestionActive
              ]}>
                {faq.question}
              </Text>
              {expandedFaq === index ? (
                <ChevronUp size={20} color={colors.primary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </View>
            {expandedFaq === index && (
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.footer}>
        Can't find what you're looking for? Contact us!
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  contactList: {
    paddingTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    backgroundColor: '#fff',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  contactDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },
  contactAction: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  faqList: {
    paddingTop: 8,
  },
  faqItem: {
    padding: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    backgroundColor: '#fff',
  },
  faqItemExpanded: {
    backgroundColor: colors.card,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  faqIconActive: {
    backgroundColor: colors.primary + '10',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 16,
    letterSpacing: -0.3,
  },
  faqQuestionActive: {
    color: colors.primary,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
    marginLeft: 56,
    marginRight: 16,
    letterSpacing: -0.2,
  },
  footer: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: -0.2,
  },
}); 