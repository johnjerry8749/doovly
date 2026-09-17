import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Location from "expo-location";

type Coords = {
  latitude: number;
  longitude: number;
} | null;

type LocationContextValue = {
  locationName: string;
  setLocationName: (name: string) => void;
  userCoords: Coords;
  setUserCoords: (coords: Coords) => void;
  loadingLocation: boolean;
  showAllNigeria: boolean;
  setShowAllNigeria: (value: boolean) => void;
  showLocationModal: boolean;
  setShowLocationModal: (value: boolean) => void;
  showCityPicker: boolean;
  setShowCityPicker: (value: boolean) => void;
  citySearch: string;
  setCitySearch: (value: string) => void;
  getUserLocation: () => Promise<void>;
  selectCity: (city: string) => void;
  viewAllInNigeria: () => void;
  closeCityPicker: () => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [locationName, setLocationName] = useState("Lagos, Nigeria");
  const [userCoords, setUserCoords] = useState<Coords>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showAllNigeria, setShowAllNigeria] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState("");

  const getUserLocation = useCallback(async () => {
    try {
      setLoadingLocation(true);
      setShowAllNigeria(false);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationName("Click here to select location");
        setUserCoords(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setUserCoords({ latitude, longitude });

      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (address.length > 0) {
        const place = address[0];
        const city =
          place.city || place.subregion || place.district || "Unknown location";
        const country = place.country || "Nigeria";
        setLocationName(`${city}, ${country}`);
      } else {
        setLocationName("Location unavailable");
      }
    } catch (error) {
      console.log("Location error:", error);
      setLocationName("Location unavailable");
      setUserCoords(null);
    } finally {
      setLoadingLocation(false);
      setShowLocationModal(false);
    }
  }, []);

  const selectCity = useCallback((city: string) => {
    setShowAllNigeria(false);
    setLocationName(`${city}, Nigeria`);
    setUserCoords(null);
    setShowCityPicker(false);
    setShowLocationModal(false);
    setCitySearch("");
  }, []);

  const viewAllInNigeria = useCallback(() => {
    setShowAllNigeria(true);
    setLocationName("All Nigeria");
    setUserCoords(null);
    setShowLocationModal(false);
  }, []);

  const closeCityPicker = useCallback(() => {
    setShowCityPicker(false);
    setCitySearch("");
  }, []);

  // Detect once on app start so Home / Services share the same location
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const value = useMemo(
    () => ({
      locationName,
      setLocationName,
      userCoords,
      setUserCoords,
      loadingLocation,
      showAllNigeria,
      setShowAllNigeria,
      showLocationModal,
      setShowLocationModal,
      showCityPicker,
      setShowCityPicker,
      citySearch,
      setCitySearch,
      getUserLocation,
      selectCity,
      viewAllInNigeria,
      closeCityPicker,
    }),
    [
      locationName,
      userCoords,
      loadingLocation,
      showAllNigeria,
      showLocationModal,
      showCityPicker,
      citySearch,
      getUserLocation,
      selectCity,
      viewAllInNigeria,
      closeCityPicker,
    ]
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return ctx;
}
