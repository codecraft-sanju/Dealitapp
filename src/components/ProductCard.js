import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProductCard({ item, isLoading, onPress, isSelected }) {
  if (isLoading) {
    return (
      <View style={[styles.card, styles.skeletonCard]}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonTextLine1} />
        <View style={styles.skeletonTextLine2} />
        <View style={styles.skeletonFooter}>
          <View style={styles.skeletonCoin} />
          <View style={styles.skeletonCategory} />
        </View>
      </View>
    );
  }

  if (!item) return null;

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => onPress && onPress(item._id)}
      style={[
        styles.card, 
        isSelected ? styles.cardSelected : styles.cardDefault
      ]}
    >
      <View style={styles.imageContainer}>
        {/* NAYA CHANGE: Moved discount badge to top corner of image */}
        {item.discount_percentage ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount_percentage}% OFF</Text>
          </View>
        ) : null}
        
        {item.images && item.images.length > 0 && item.images[0] ? (
          <Image 
            source={{ uri: item.images[0] }} 
            style={styles.image} 
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="cube-outline" size={32} color="#A388E1" style={{ opacity: 0.4 }} />
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <View style={styles.coinWrapper}>
              <Ionicons name="cash" size={10} color="#ca8a04" />
            </View>
            <Text style={styles.priceText}>{item.estimated_value || '0'}</Text>
            {item.original_value ? (
              <Text style={styles.originalPriceText}>{item.original_value}</Text>
            ) : null}
          </View>
          
          {/* CATEGORY SECTION */}
          {item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    borderRadius: 16,
    padding: 10,
    marginRight: 12,
  },
  cardDefault: {
    backgroundColor: '#F8F6FF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: '#f8f6ff',
    borderWidth: 2,
    borderColor: '#6B46C1',
    transform: [{ scale: 0.98 }],
    ...Platform.select({
      ios: { shadowColor: '#6B46C1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF4747',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 },
      android: { elevation: 1 },
    }),
  },
  discountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinWrapper: {
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    padding: 2,
  },
  priceText: {
    fontWeight: '700',
    color: '#111827',
    fontSize: 12,
  },
  originalPriceText: {
    fontSize: 10,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    fontWeight: '500',
    marginLeft: 4,
  },
  categoryBadge: {
    backgroundColor: '#EBE5F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 65,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#A388E1',
  },
  // Skeleton Styles
  skeletonCard: {
    backgroundColor: '#F8F6FF',
    borderWidth: 1,
    borderColor: '#f9fafb',
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#EBE5F7',
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonTextLine1: {
    height: 10,
    width: '100%',
    backgroundColor: '#EBE5F7',
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonTextLine2: {
    height: 10,
    width: '66%',
    backgroundColor: '#EBE5F7',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  skeletonCoin: {
    height: 14,
    width: 40,
    backgroundColor: '#EBE5F7',
    borderRadius: 6,
  },
  skeletonCategory: {
    height: 12,
    width: 48,
    backgroundColor: '#EBE5F7',
    borderRadius: 6,
  }
});