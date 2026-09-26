import React, { useState } from "react";
import {
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  images: ImageSourcePropType[];
  height?: number;
  borderRadius?: number;
};

/**
 * Horizontal paging slider for request photos (up to 4).
 * Shows dots + page badge when more than one image.
 */
export default function RequestImageSlider({
  images,
  height = 180,
  borderRadius = 12,
}: Props) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  if (!images?.length) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) setWidth(w);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageWidth = e.nativeEvent.layoutMeasurement.width || width;
    if (pageWidth <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setIndex(next);
  };

  return (
    <View
      style={[styles.wrap, { height, borderRadius }]}
      onLayout={onLayout}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        bounces={false}
      >
        {images.map((source, i) => (
          <Image
            key={`slide-${i}`}
            source={source as any}
            style={[
              styles.image,
              { height },
              width > 0 ? { width } : { width: "100%" as any },
            ]}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {images.length > 1 ? (
        <>
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {index + 1}/{images.length}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    marginBottom: 10,
    overflow: "hidden",
  },
  image: {
    backgroundColor: "#E5E7EB",
  },
  dots: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
